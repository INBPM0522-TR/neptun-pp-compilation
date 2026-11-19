# Neptun++ v11-swagger – óraterv: API-dokumentáció OpenAPI-val és Swagger UI-jal (35 perc)

**Kiinduló állapot:** a `neptun-pp-v10` mappa (navbar, EmptyRow, rendezhető fejlécek v1/v2/v3).
**Végállapot:** ez a mappa (`neptun-pp-v11-swagger`).

**Az óra célja:**

* **OpenAPI** (korábbi nevén Swagger specifikáció): a REST API géppel olvasható leírása
  (végpontok, paraméterek, kérés- és választörzsek, hibakódok) JSON-ben vagy YAML-ben;
* **Swagger UI**: ebből generált weboldal, ahol az API böngészhető és **ki is próbálható**
  („Try it out”), Postman vagy `curl` nélkül;
* a **springdoc-openapi** a Spring kódból (a `@GetMapping`, `@RequestBody`, `@Valid`, `@NotBlank`
  annotációkból) **magától** előállítja a leírást. Mi csak kiegészítjük: magyar leírások,
  példák, hibakódok;
* a Swagger UI a frontend navbarjából is elérhető, a proxyn keresztül.

| # | Téma | Idő |
|---|---|---|
| 1 | springdoc: függőség, konfiguráció | 5' |
| 2 | Az API általános adatai (`OpenAPI` bean) | 5' |
| 3 | Végpontok dokumentálása: `@Tag`, `@Operation`, `@ApiResponse`, `@Parameter` | 15' |
| 4 | Modellek: `@Schema` | 5' |
| 5 | Elérés a frontendről | 5' |
| | **Összesen** | **35'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni.

Futtatás (JDK 25):

```bash
cd neptun-pp && mvn spring-boot:run           # http://localhost:8083/swagger-ui/index.html
cd neptun-pp-ng && npm install && npm start   # http://localhost:4200 → navbar: API
```

---

## 1. springdoc: függőség, konfiguráció (5')

### 1.1 Függőség

A `springdoc-openapi-starter-webmvc-ui` két dolgot ad:

* `GET /v3/api-docs`: az OpenAPI leírás JSON-ben (`/v3/api-docs.yaml`: YAML-ben);
* `GET /swagger-ui/index.html`: a Swagger UI.

A springdoc 3.x a Spring Boot 4-hez való (a 2.x a Spring Boot 3-hoz).

**Hova:** `neptun-pp/pom.xml` – a `<dependencies>` közé

```xml
        <!-- OpenAPI leírás (/v3/api-docs) és Swagger UI (/swagger-ui/index.html) -->
        <!-- https://mvnrepository.com/artifact/org.springdoc/springdoc-openapi-starter-webmvc-ui -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>3.0.3</version>
        </dependency>
```

Már ennyi után, egyetlen annotáció nélkül is működik: indítsd újra a backendet, és nézd meg
a `http://localhost:8083/swagger-ui/index.html` és a `http://localhost:8083/v3/api-docs`
címet. A végpontok, a `Student` séma, sőt a `@NotBlank` és a `@Size(min = 3, max = 100)` is
látszik (`minLength`, `maxLength`, `required`).

### 1.2 Konfiguráció

* `paths-to-match: /api/**`: csak a REST API kerüljön a leírásba;
* `operations-sorter: method`, `tags-sorter: alpha`: rendezés HTTP-metódus és címke szerint;
* `try-it-out-enabled`: a „Try it out” gomb alapból be van kapcsolva.

**Hova:** `neptun-pp/src/main/resources/application.yml` – a fájl **teljes tartalmát** cseréld le erre

```yaml
server.port: 8083
spring:
  banner:
    location: classpath:banner.txt
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
    username: sa
  jpa:
    database-platform: org.hibernate.dialect.H2Dialect
    generate-ddl: true
    show-sql: true
  h2.console:
    enabled: true
    path: /db

# OpenAPI (/v3/api-docs) és Swagger UI (/swagger-ui/index.html)
springdoc:
  # csak a REST API kerüljön a leírásba (a H2 konzol és a hibaoldal ne)
  paths-to-match: /api/**
  swagger-ui:
    operations-sorter: method
    tags-sorter: alpha
    try-it-out-enabled: true
```

---

## 2. Az API általános adatai (5')

Egy `OpenAPI` típusú beannel adjuk meg a leírás fejlécét: cím, verzió, leírás.

A **`servers`** fontos: alapból a springdoc a kérés `Host` fejlécéből rakja össze a szerver
címét. A frontend proxyja (`changeOrigin: true`) ezt `localhost:8083`-ra írja át, így a
`localhost:4200`-ról megnyitott Swagger UI a „Try it out” kéréseket közvetlenül a 8083-as
portra küldené, amit a böngésző CORS miatt letiltana. A relatív `/` cím miatt a kérések
oda mennek, ahonnan a Swagger UI-t megnyitottuk.

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/config/OpenApiConfig.java` – **új fájl**

```java
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
```

---

## 3. Végpontok dokumentálása (15')

A springdoc annotációi (`io.swagger.v3.oas.annotations`):

| Annotáció | Hova? | Mire? |
|---|---|---|
| `@Tag(name, description)` | osztály vagy metódus | csoportosítás a Swagger UI-ban |
| `@Operation(summary, description)` | metódus | rövid és hosszú leírás |
| `@ApiResponse(responseCode, description, content)` | metódus (ismételhető) | a lehetséges válaszok, pl. 404, 409 |
| `@Parameter(description, example)` | paraméter | útvonal- és query-paraméterek |
| `@Hidden` | osztály vagy metódus | kimarad a leírásból |

Mivel nálunk a kontrollerek **interfészekben** vannak (a `@GetMapping` is ott van), a
dokumentáció is oda kerül: az implementáció tiszta marad.

A hibaválaszok sémája a Spring `ProblemDetail` osztálya; a `GlobalExceptionHandler` ilyet ad
vissza. A `mediaType` `application/problem+json`, mert a Spring ezt a típust küldi hibánál.

### 3.1 Hallgatók

A korábbi órák gyakorló végpontjai (letöltés, kép, átirányítás, keresés) külön „Demó”
címkét kapnak, hogy ne keveredjenek a CRUD végpontokkal. Ezért itt a `@Tag` metódusszinten
van: az osztályszintű címke minden metódusra érvényes, a metódusszintű pedig nem lecseréli,
hanem kiegészíti azt. (Egy tag leírását elég egyszer megadni, a többi helyen a név elég.)

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/web/StudentController.java` – a fájl **teljes tartalmát** cseréld le erre

```java
package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Program;
import hu.inf.unideb.neptun.model.Student;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * A címkék metódusszinten vannak: egy osztályszintű @Tag MINDEN metódusra érvényes lenne, és a
 * metódusszintű csak hozzáadódna (a demó végpontok a "Hallgatók" alatt is megjelennének).
 */
public interface StudentController {

    @Tag(name = "Demó")
    @Operation(summary = "Hallgatók CSV-ben", description = "Soronként: `neptun;név;szak`")
    @GetMapping(
            path = "/api/student/download",
            produces = "text/csv")
    String download();

    @Tag(name = "Demó")
    @Operation(summary = "Hallgatók letöltése fájlként",
            description = "Ugyanaz, mint a `/download`, de `Content-Disposition: attachment` fejléccel.")
    @GetMapping("/api/student/download-v2")
    ResponseEntity<String> download2();

    @Tag(name = "Demó")
    @Operation(summary = "Kép visszaadása (byte[] válasz)")
    @GetMapping("/api/student/img")
    ResponseEntity<byte[]> img();

    @Tag(name = "Demó")
    @Operation(summary = "Átirányítás (303 See Other)")
    @GetMapping("/api/student/redirect")
    ResponseEntity<Void> redirect();

    @Tag(name = "Demó")
    @Operation(summary = "Keresés", description = "Minden feltétel opcionális; a név és a Neptun-kód részszóra is illeszkedik.")
    @GetMapping("/api/student/search")
    List<Student> search(
            @Parameter(description = "A név egy része (kis- és nagybetű nem számít)", example = "an")
            @RequestParam Optional<String> name,
            @Parameter(description = "A Neptun-kód egy része", example = "A1")
            @RequestParam Optional<String> neptun,
            @Parameter(description = "Szak")
            @RequestParam Optional<Program> program);

    @Tag(name = "Hallgatók", description = "Hallgatók listázása, létrehozása, módosítása és törlése")
    @Operation(summary = "Egy hallgató lekérése")
    @ApiResponse(responseCode = "200", description = "A hallgató")
    @ApiResponse(responseCode = "404", description = "Nincs ilyen Neptun-kódú hallgató",
            content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                    schema = @Schema(implementation = ProblemDetail.class)))
    @RequestMapping(
            path = "/api/student/{neptun}",
            method = RequestMethod.GET,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    Student getOne(
            @Parameter(description = "A hallgató Neptun-kódja", example = "ABC123")
            @PathVariable String neptun);

    @Tag(name = "Hallgatók")
    @Operation(summary = "Az összes hallgató")
    @GetMapping("/api/student")
    List<Student> getAll();

    @Tag(name = "Hallgatók")
    @Operation(summary = "Új hallgató létrehozása",
            description = "A Neptun-kódot, a létrehozás és a módosítás idejét a szerver tölti ki; "
                    + "a kérésben elég a `name` és a `program`.")
    @ApiResponse(responseCode = "200", description = "A létrehozott hallgató, a generált Neptun-kóddal")
    @ApiResponse(responseCode = "400", description = "Validációs hiba; a mezőnkénti hibák az `errors` objektumban",
            content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                    schema = @Schema(implementation = ProblemDetail.class)))
    @PostMapping("/api/student")
    Student createOne(
            @Valid @RequestBody Student student);

    @Tag(name = "Hallgatók")
    @Operation(summary = "Hallgató módosítása", description = "A `neptun` alapján keresi meg; a nevet és a szakot írja felül.")
    @ApiResponse(responseCode = "200", description = "A módosított hallgató")
    @ApiResponse(responseCode = "400", description = "Validációs hiba; a mezőnkénti hibák az `errors` objektumban",
            content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                    schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Nincs ilyen Neptun-kódú hallgató",
            content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                    schema = @Schema(implementation = ProblemDetail.class)))
    @PutMapping("/api/student")
    Student updateOne(
            @Valid @RequestBody Student student);

    @Tag(name = "Hallgatók")
    @Operation(summary = "Hallgató törlése")
    @ApiResponse(responseCode = "200", description = "Törölve (vagy nem is létezett)")
    @ApiResponse(responseCode = "409", description = "A hallgatónak van tárgyfelvétele, ezért nem törölhető",
            content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                    schema = @Schema(implementation = ProblemDetail.class)))
    @DeleteMapping("/api/student/{neptun}")
    void deleteOne(
            @Parameter(description = "A hallgató Neptun-kódja", example = "ABC123")
            @PathVariable String neptun);
}
```

### 3.2 Tárgyak és tárgyfelvételek

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/web/SubjectController.java` – a fájl **teljes tartalmát** cseréld le erre

```java
package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Subject;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Tag(name = "Tárgyak")
public interface SubjectController {

    @Operation(summary = "Az összes tárgy")
    @GetMapping("/api/subject")
    List<Subject> getAll();
}
```

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/web/EnrollmentController.java` – a fájl **teljes tartalmát** cseréld le erre

```java
package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Enrollment;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Tag(name = "Tárgyfelvételek")
public interface EnrollmentController {

    @Operation(summary = "Az összes tárgyfelvétel",
            description = "Minden tárgyfelvételben benne van a teljes hallgató és tárgy objektum.")
    @GetMapping("/api/enrollment")
    List<Enrollment> getAll();
}
```

---

## 4. Modellek: `@Schema` (5')

A mezők típusát, az enum értékeit és a validációs szabályokat (`@NotBlank` → `required`,
`@Size` → `minLength`/`maxLength`) a springdoc magától felismeri. A `@Schema`-val leírást és
**példaértéket** adunk; a Swagger UI ebből tölti ki a „Try it out” kéréstörzsét.

* `accessMode = READ_ONLY`: csak a válaszban szerepel, a kérésben nem kell megadni (a szerver
  tölti ki).

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/model/Student.java` – a fájl **teljes tartalmát** cseréld le erre

```java
package hu.inf.unideb.neptun.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@With
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Entity
@Schema(description = "Hallgató")
public class Student {
    @Id
    @EqualsAndHashCode.Include
    @Schema(description = "Neptun-kód: létrehozáskor a szerver generálja, módosításkor ez azonosítja a hallgatót",
            example = "ABC123")
    private String neptun;
    @NotBlank
    @Size(min = 3, max = 100)
    @Schema(description = "Teljes név", example = "Minta Márton")
    private String name;
    @Enumerated(EnumType.STRING)
    @NotNull
    @Schema(description = "Szak", example = "CS_BSC")
    private Program program;
    @Schema(description = "Létrehozás ideje", accessMode = Schema.AccessMode.READ_ONLY)
    private OffsetDateTime created;
    @Schema(description = "Utolsó módosítás ideje", accessMode = Schema.AccessMode.READ_ONLY)
    private OffsetDateTime updated;

}
```

Próba a Swagger UI-ban:

1. **Hallgatók → POST /api/student → Try it out**: a példatörzzsel (`"name": "Minta Márton"`)
   küldd el, a válaszban ott a generált Neptun-kód;
2. ugyanez üres névvel: `400`, mezőnkénti hibával;
3. **GET /api/student/{neptun}** egy nem létező kóddal: `404`;
4. a **Schemas** résznél nézd meg a `Student` sémát: `name`: `minLength: 3`, `maxLength: 100`.

---

## 5. Elérés a frontendről (5')

A Swagger UI-t a frontend navbarjából is elérhetővé tesszük. Ehhez a proxynak a Swagger UI
fájljait (`/swagger-ui/**`) és az OpenAPI leírást (`/v3/api-docs/**`) is a backendhez kell
vinnie.

**Hova:** `neptun-pp-ng/proxy.conf.json` – a fájl **teljes tartalmát** cseréld le erre

```json
{
  "/api/**": {
    "target": "http://localhost:8083/",
    "changeOrigin": true
  },
  "/swagger-ui/**": {
    "target": "http://localhost:8083/",
    "changeOrigin": true
  },
  "/v3/api-docs/**": {
    "target": "http://localhost:8083/",
    "changeOrigin": true
  },
  "/v3/api-docs": {
    "target": "http://localhost:8083/",
    "changeOrigin": true
  }
}
```

A link egy sima `href` (nem `routerLink`!), mert a Swagger UI nem az Angular alkalmazás része:
a böngészőnek teljes oldalt kell betöltenie. Új lapon nyílik meg.

**Hova:** `neptun-pp-ng/src/app/app.html` – a fájl **teljes tartalmát** cseréld le erre

```html
<nav class="navbar bg-dark navbar-expand-lg sticky-top" data-bs-theme="dark">
  <div class="container">
    <a class="navbar-brand" [routerLink]="'/'">
      <img src="https://inf.unideb.hu/themes/custom/unideb_gamma/logo.svg" alt="Logo" width="30" height="24"
           class="d-inline-block align-text-top">
      Neptun++
    </a>

    <!-- kis kijelzőn a menü összecsukódik (Bootstrap JS: data-bs-toggle="collapse") -->
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="navbarSupportedContent">
      <!-- routerLinkActive: az aktív útvonal linkje megkapja az 'active' osztályt -->
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <a class="nav-link"
             [routerLink]="'student'"
             [routerLinkActive]="'active'">Hallgatók</a>
        </li>
        <li class="nav-item">
          <a class="nav-link"
             [routerLink]="'subject'"
             [routerLinkActive]="'active'">Tárgyak</a>
        </li>
        <li class="nav-item">
          <a class="nav-link"
             [routerLink]="'enrollment'"
             [routerLinkActive]="'active'">Tárgyfelvételek</a>
        </li>
      </ul>

      <!-- a Swagger UI nem az Angular része: sima href, új lapon (a proxy viszi a backendhez) -->
      <a class="btn btn-sm btn-outline-light" href="/swagger-ui/index.html" target="_blank"
         title="API-dokumentáció (Swagger UI)">
        <i class="bi bi-braces"></i>
        <span class="d-none d-md-inline ms-1">API</span>
      </a>
    </div>
  </div>
</nav>

<router-outlet />
```

A `proxy.conf.json` módosítása után az `npm start`-ot újra kell indítani.

---

## Függelék

### Az OpenAPI leírás felhasználása

* **mentés fájlba**: `curl http://localhost:8083/v3/api-docs.yaml > openapi.yaml`; ezt
  verziókezelni érdemes, mert a változásai az API változásai;
* **kliensgenerálás**: a leírásból kliens kód generálható, pl. Angularhoz:

  ```bash
  npx @openapitools/openapi-generator-cli generate \
      -i http://localhost:8083/v3/api-docs -g typescript-angular -o src/app/_generated
  ```

  Ekkor a `Student` interfészt és a `StudentClient`-et nem kézzel írjuk, hanem a backendből
  generáljuk, és egy backendváltozás fordítási hibaként jelenik meg a frontenden;
* **„API first”**: fordított irány; előbb az `openapi.yaml`-t írjuk meg, és abból generáljuk
  a backend interfészeit is (a mi `StudentController` interfészeinkhez hasonlókat).

### Élesben

A Swagger UI-t élesben gyakran kikapcsolják, vagy jogosultsághoz kötik:

```yaml
springdoc:
  swagger-ui.enabled: false
  api-docs.enabled: false
```

### Megoldás

A lépések végeredménye ebben a mappában (`neptun-pp-v11-swagger`) van. A többi v11 változat
ugyanebből a v10-es állapotból indul, egymástól függetlenül.
