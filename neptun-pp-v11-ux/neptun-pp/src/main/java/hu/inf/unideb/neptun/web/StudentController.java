package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Program;
import hu.inf.unideb.neptun.model.Student;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

public interface StudentController {

    @GetMapping(
            path = "/api/student/download",
            produces = "text/csv")
    String download();

    @GetMapping("/api/student/download-v2")
    ResponseEntity<String> download2();

    @GetMapping("/api/student/img")
    ResponseEntity<byte[]> img();

    @GetMapping("/api/student/redirect")
    ResponseEntity<Void> redirect();

    @GetMapping("/api/student/search")
    List<Student> search(
            @RequestParam Optional<String> name,
            @RequestParam Optional<String> neptun,
            @RequestParam Optional<Program> program);

    @RequestMapping(
            path = "/api/student/{neptun}",
            method = RequestMethod.GET,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    Student getOne(
            @PathVariable String neptun);

    @GetMapping("/api/student")
    List<Student> getAll();

    @PostMapping("/api/student")
    Student createOne(
            @Valid @RequestBody Student student);

    @PutMapping("/api/student")
    Student updateOne(
            @Valid @RequestBody Student student);

    @DeleteMapping("/api/student/{neptun}")
    void deleteOne(
            @PathVariable String neptun);
}
