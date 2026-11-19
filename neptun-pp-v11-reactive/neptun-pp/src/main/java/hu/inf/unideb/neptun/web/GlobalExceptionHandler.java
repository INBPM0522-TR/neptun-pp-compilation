package hu.inf.unideb.neptun.web;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Központi hibakezelés: kivétel → HTTP státuszkód + egységes JSON (ProblemDetail).
 * <p>
 * Válasz pl.:
 * <pre>
 * { "status": 404, "title": "Not Found", "detail": "...", "instance": "/api/student/XYZ" }
 * </pre>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** findById(...).orElseThrow() → NoSuchElementException → 404 */
    @ExceptionHandler(NoSuchElementException.class)
    public ProblemDetail handleNotFound(final NoSuchElementException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Not found");
    }

    /** Idegen kulcs sérülne (pl. tárgyfelvétellel rendelkező hallgató törlése) → 409 */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleConflict(final DataIntegrityViolationException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Data integrity violation");
    }

    /**
     * A @Valid ellenőrzés elbukott → 400, mezőnkénti hibákkal:
     * "errors": { "name": "nem lehet üres", "program": "nem lehet null" }
     * <p>
     * Az üzenetek nyelvét a kérés Accept-Language fejléce határozza meg
     * (a Hibernate Validator magyarul és angolul is tud).
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(final MethodArgumentNotValidException e) {
        final var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        problem.setProperty("errors", e.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        FieldError::getDefaultMessage,
                        (first, second) -> first + ", " + second)));
        return problem;
    }
}
