package hu.inf.unideb.neptun.runner;

import com.github.javafaker.Faker;
import hu.inf.unideb.neptun.model.Program;
import hu.inf.unideb.neptun.model.Student;
import hu.inf.unideb.neptun.repository.StudentRepository;
import hu.inf.unideb.neptun.util.NeptunUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Component
@RequiredArgsConstructor
@Order(1)
public class StudentRunner
        implements CommandLineRunner {

    private static final Faker FAKER = new Faker();
    private final StudentRepository repository;

    @Override
    @Transactional
    public void run(String... args) {
        for (int i = 0; i < 1000; i++) {
            System.out.println(
                    repository.save(
                            Student.builder()
                                    .neptun(NeptunUtils.nextNeptun())
                                    .name(FAKER.name().fullName())
                                    .program(Program.next())
                                    .created(OffsetDateTime.now())
                                    .updated(OffsetDateTime.now())
                                    .build()
                    )
            );
        }
    }
}
