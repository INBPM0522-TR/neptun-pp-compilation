package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Program;
import hu.inf.unideb.neptun.model.Student;
import hu.inf.unideb.neptun.repository.StudentRepository;
import hu.inf.unideb.neptun.util.NeptunUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class StudentControllerImpl
        implements StudentController {

    private static final Logger LOGGER = LoggerFactory
            .getLogger(StudentControllerImpl.class);

    private final StudentRepository repository;

    @Override
    public String download() {
        return repository.findAll()
                .stream()
                .map(s -> "%s;%s;%s".formatted(
                        s.getNeptun(), s.getName(),
                        s.getProgram()
                ))
                .collect(Collectors.joining("\n"));
    }

    @Override
    public ResponseEntity<String> download2() {
        final var headers = new HttpHeaders();
        headers.add("Content-Type",
                "text/csv");
        headers.add("Content-Disposition",
                "attachment; filename=students.csv");
        return ResponseEntity.ok()
                .headers(headers)
                .body(download());
    }

    @Override
    public ResponseEntity<byte[]> img() {
        try {
            return ResponseEntity.ok()
                    .header("Content-Type", "image/jpeg")
                    .body(
                            IOUtils.toByteArray(
                                    getClass().getResourceAsStream("/imsfasfsg.jpg")
                            )
                    );
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Override
    public ResponseEntity<Void> redirect() {
        return ResponseEntity
                .status(HttpStatus.SEE_OTHER)
                .header("Location", "https://inf.unideb.hu")
                .body(null);
    }

    @Override
    public List<Student> search(
            Optional<String> name,
            Optional<String> neptun,
            Optional<Program> program) {

        return getAll()
                .stream()
                .filter(s -> program
                        .map(p -> p == s.getProgram())
                        .orElse(true))
                .filter(s -> name
                        .map(String::toLowerCase)
                        .map(v -> s.getName().toLowerCase().contains(v))
                        .orElse(true))
                .filter(s -> neptun
                        .map(String::toLowerCase)
                        .map(v -> s.getNeptun().toLowerCase().contains(v))
                        .orElse(true))
                .toList();

    }

    @Override
    public Student getOne(String neptun) {
        LOGGER.info("getOne({})", neptun);

        return repository.findById(neptun)
                .orElseThrow();
    }

    @Override
    public List<Student> getAll() {
        LOGGER.info("getAll()");
        return repository.findAll();
    }

    @Transactional
    @Override
    public Student createOne(
            Student student) {
        LOGGER.info("createOne({})", student);
        return repository.save(
                student.withNeptun(NeptunUtils.nextNeptun())
                        .withCreated(OffsetDateTime.now())
                        .withUpdated(OffsetDateTime.now())
        );
    }

    @Override
    public Student updateOne(
            Student student) {
        LOGGER.info("updateOne({})", student);

        return Optional.of(student)
                .map(Student::getNeptun)
                .flatMap(repository::findById)
                .map(s -> {
                    s.setName(student.getName());
                    s.setProgram(student.getProgram());
                    s.setUpdated(OffsetDateTime.now());
                    return s;
                })
                .map(repository::save)
                .orElseThrow();
    }

    @Override
    public void deleteOne(String neptun) {
        LOGGER.info("deleteOne({})", neptun);
        repository.deleteById(neptun);
    }
}
