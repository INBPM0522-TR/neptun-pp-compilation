package hu.inf.unideb.neptun.runner;

import hu.inf.unideb.neptun.model.Enrollment;
import hu.inf.unideb.neptun.repository.EnrollmentRepository;
import hu.inf.unideb.neptun.repository.StudentRepository;
import hu.inf.unideb.neptun.repository.SubjectRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.Random;

@Component
@RequiredArgsConstructor
@Order(2)
public class EnrollmentRunner
        implements CommandLineRunner {

    private static final Random RANDOM = new Random();

    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SubjectRepository subjectRepository;

    @Transactional
    @Override
    public void run(String... args) throws Exception {
        final var students = studentRepository.findAll();
        final var subjects = subjectRepository.findAll();
        // Az első 20 hallgató felvesz egy-egy véletlen tárgyat, véletlen jeggyel.
        for (final var student : students.subList(0, 20)) {
            enrollmentRepository.save(
                Enrollment.builder()
                        .student(student)
                        .subject(subjects.get(RANDOM.nextInt(subjects.size())))
                        .grade(RANDOM.nextInt(1, 6))
                        .created(OffsetDateTime.now())
                        .updated(OffsetDateTime.now())
                        .build()
            );
        }
    }
}
