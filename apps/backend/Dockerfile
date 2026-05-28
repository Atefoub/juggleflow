##
## JuggleFlow Backend — Production image
##
## Build:
##   podman build -t juggleflow-backend:local apps/backend
##
## Run (example):
##   podman run --rm -p 8080:8080 \
##     -e SPRING_PROFILES_ACTIVE=prod \
##     -e POSTGRES_PASSWORD=... \
##     -e JWT_SECRET=... \
##     juggleflow-backend:local
##

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml .
COPY .mvn .mvn
COPY mvnw mvnw
RUN chmod +x mvnw

RUN ./mvnw -q -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests package


FROM eclipse-temurin:21-jre-jammy AS runtime

RUN useradd --system --uid 10001 --create-home appuser
WORKDIR /app

COPY --from=build /workspace/target/*.jar /app/app.jar
RUN chown -R appuser:appuser /app

USER 10001
EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["/bin/sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

