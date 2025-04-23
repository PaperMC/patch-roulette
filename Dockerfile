FROM eclipse-temurin:21.0.7_6-jre-alpine

RUN apk add --no-cache dumb-init

COPY build/libs/patch-roulette.jar /app/patch-roulette.jar

WORKDIR /app

ENTRYPOINT ["dumb-init", "--"]
CMD ["java", "-jar", "patch-roulette.jar"]
