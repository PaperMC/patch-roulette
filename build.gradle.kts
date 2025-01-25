plugins {
    id("net.kyori.indra") version "3.1.3"
    id("org.springframework.boot") version "3.4.2"
    id("io.spring.dependency-management") version "1.1.7"
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
    implementation("jakarta.validation:jakarta.validation-api:3.1.0")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
