import java.time.Instant
import net.ltgt.gradle.errorprone.errorprone
import net.ltgt.gradle.nullaway.nullaway

plugins {
    id("net.kyori.indra") version "4.0.0"
    id("net.kyori.indra.git") version "4.0.0"
    id("org.springframework.boot") version "4.1.0"
    id("io.spring.dependency-management") version "1.1.7"
    id("com.google.cloud.tools.jib") version "3.5.4"
    id("dev.lukebemish.immaculate") version "0.2.5"
    id("net.ltgt.errorprone") version "5.1.0"
    id("net.ltgt.nullaway") version "3.1.0"
}

indra {
    javaVersions().target(25)
}

repositories {
    mavenCentral()
}

immaculate {
    workflows.register("java") {
        java()
        palantir()
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-loader")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.springframework.boot:spring-boot-starter-security")
    compileOnly("org.jspecify:jspecify")
    runtimeOnly("com.h2database:h2") // for local
    runtimeOnly("org.postgresql:postgresql") // for prod
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    errorprone("com.google.errorprone:error_prone_core:2.50.0")
    errorprone("com.uber.nullaway:nullaway:0.13.8")
}

nullaway {
    onlyNullMarked = true
    jspecifyMode = true
}

tasks.withType<JavaCompile>().configureEach {
    options.errorprone {
        disableAllChecks = true // Only NullAway is enabled
        error("RequireExplicitNullMarking")
        nullaway {
            error()
        }
        option("NullAway:CustomContractAnnotations", "org.springframework.lang.Contract")
    }
}

buildscript {
  dependencies {
    classpath("com.google.cloud.tools:jib-spring-boot-extension-gradle:0.1.0")
  }
}

tasks.register<Copy>("copyFrontend") {
    from("web/build")
    into("build/resources/main/public")
}
tasks.getByName("processResources") {
    dependsOn("copyFrontend")
}

jib {
  pluginExtensions {
    pluginExtension {
      implementation = "com.google.cloud.tools.jib.gradle.extension.springboot.JibSpringBootExtension"
    }
  }

  container {
    args = listOf("--spring.config.additional-location=optional:file:/app/config/application.yaml")
    ports = listOf("8080")
    workingDirectory = "/app"
  }

  from {
    image = "azul/zulu-openjdk-alpine:${indra.javaVersions().target().get()}-jre"
    platforms {
      // We can only build multi-arch images when pushing to a registry, not when building locally
      val requestedTasks = gradle.startParameter.taskNames
      if ("jibBuildTar" in requestedTasks || "jibDockerBuild" in requestedTasks) {
        platform {
          // todo: better logic
          architecture = when (System.getProperty("os.arch")) {
            "aarch64" -> "arm64"
            else -> "amd64"
          }
          os = "linux"
        }
      } else {
        platform {
          architecture = "amd64"
          os = "linux"
        }
        platform {
          architecture = "arm64"
          os = "linux"
        }
      }
    }
  }

  to {
    image = "ghcr.io/papermc/patch-roulette"
    tags = setOf(
      "latest",
      "${indraGit.branchName().get()}-${indraGit.commit().get().name().take(7)}-${Instant.now().epochSecond}"
    )
  }
}
