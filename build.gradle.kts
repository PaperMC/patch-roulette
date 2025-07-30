import java.time.Instant

plugins {
    id("net.kyori.indra") version "3.2.0"
    id("net.kyori.indra.git") version "3.1.3"
    id("org.springframework.boot") version "3.5.4"
    id("io.spring.dependency-management") version "1.1.7"
    id("com.google.cloud.tools.jib") version "3.4.5"
}

indra {
    javaVersions().target(21)
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-loader")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    runtimeOnly("com.h2database:h2:2.3.232") // for local
    runtimeOnly("org.postgresql:postgresql") // for prod
    testImplementation("org.springframework.boot:spring-boot-starter-test")
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
      "${indraGit.branchName()}-${indraGit.commit()?.name()?.take(7)}-${Instant.now().epochSecond}"
    )
  }
}
