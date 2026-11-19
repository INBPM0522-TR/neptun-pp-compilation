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
