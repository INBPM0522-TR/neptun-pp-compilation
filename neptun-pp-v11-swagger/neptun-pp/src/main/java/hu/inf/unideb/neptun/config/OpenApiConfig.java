package hu.inf.unideb.neptun.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/** Az OpenAPI leírás általános adatai (a Swagger UI tetején látszanak). */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI neptunOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Neptun++ API")
                        .version("v11")
                        .description("""
                                Hallgatók, tárgyak és tárgyfelvételek REST API-ja.

                                A hibákat egységes `ProblemDetail` JSON-ben adja vissza \
                                (RFC 9457), a validációs hibákat mezőnként az `errors` objektumban, \
                                az `Accept-Language` fejléc szerinti nyelven.""")
                        .license(new License().name("Oktatási célra")))
                // relatív cím: a "Try it out" oda küldi a kéréseket, ahonnan a Swagger UI-t
                // megnyitottuk (a proxyn át is, CORS nélkül)
                .servers(List.of(new Server().url("/").description("ez a szerver")));
    }
}
