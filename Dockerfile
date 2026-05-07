# Multi-stage build for the Spring Boot backend.
# Build stage compiles via Gradle; runtime stage uses a slim JRE so the final
# image stays around ~250 MB. fontconfig is installed because Java AWT (used by
# OgFallbackBannerProvider to render the placeholder banner) initializes the
# font subsystem on Graphics2D creation even when no glyphs are drawn.

FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY gradlew gradlew.bat ./
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends fontconfig \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/build/libs/*.jar app.jar
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=70.0 -XX:InitialRAMPercentage=40.0 -Djava.awt.headless=true"
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
