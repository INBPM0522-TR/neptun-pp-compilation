package hu.inf.unideb.neptun.web;

import hu.inf.unideb.neptun.model.Program;
import hu.inf.unideb.neptun.model.Student;
import hu.inf.unideb.neptun.repository.StudentRepository;
import hu.inf.unideb.neptun.util.NeptunUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;

/**
 * Szerveroldali (Thymeleaf) oldalak. A metódusok SABLONNEVET adnak vissza
 * (pl. "student-list" → templates/student-list.html), az adatokat a Model-be teszik.
 */
@Controller
@RequiredArgsConstructor
public class StudentPageController {

    /** Csak ezek szerint lehet rendezni (a felhasználó bármit beírhat az URL-be!) */
    private static final Set<String> SORTABLE = Set.of("neptun", "name", "program", "created", "updated");

    private final StudentRepository repository;

    /** Minden sablon megkapja (a legördülő listához) */
    @ModelAttribute("programs")
    public Program[] programs() {
        return Program.values();
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/student";
    }

    /** /student?orderBy=name&desc=true */
    @GetMapping("/student")
    public String list(
            @RequestParam final Optional<String> orderBy,
            @RequestParam(defaultValue = "false") final boolean desc,
            final Model model) {
        final var validOrderBy = orderBy.filter(SORTABLE::contains);
        final var sort = validOrderBy
                .map(property -> Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, property))
                .orElse(Sort.unsorted());

        model.addAttribute("students", repository.findAll(sort));
        model.addAttribute("orderBy", validOrderBy.orElse(null));
        model.addAttribute("desc", desc);
        return "student-list";
    }

    @GetMapping("/student/create")
    public String create(final Model model) {
        model.addAttribute("student", new Student());
        return "student-edit";
    }

    @GetMapping("/student/{neptun}")
    public String edit(@PathVariable final String neptun, final Model model) {
        model.addAttribute("student", findOrNotFound(neptun));
        return "student-edit";
    }

    /**
     * Létrehozás és módosítás. Hibás adatoknál UGYANAZT az oldalt adjuk vissza (a beírt
     * értékekkel és a hibákkal); sikernél átirányítunk (Post/Redirect/Get).
     */
    @PostMapping("/student/save")
    public String save(
            @Valid @ModelAttribute("student") final Student student,
            final BindingResult bindingResult,
            final RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            return "student-edit";
        }

        final var now = OffsetDateTime.now();
        final Student saved;
        if (student.getNeptun() == null || student.getNeptun().isBlank()) {
            saved = repository.save(student
                    .withNeptun(NeptunUtils.nextNeptun())
                    .withCreated(now)
                    .withUpdated(now));
        } else {
            final var existing = findOrNotFound(student.getNeptun());
            existing.setName(student.getName());
            existing.setProgram(student.getProgram());
            existing.setUpdated(now);
            saved = repository.save(existing);
        }

        // a flash attribútum csak a következő kérésig (az átirányítás utáni GET-ig) él
        redirectAttributes.addFlashAttribute("success", "Sikeres mentés!");
        return "redirect:/student/" + saved.getNeptun();
    }

    @PostMapping("/student/{neptun}/delete")
    public String delete(@PathVariable final String neptun, final RedirectAttributes redirectAttributes) {
        try {
            repository.deleteById(neptun);
            redirectAttributes.addFlashAttribute("success", "A hallgatót töröltük.");
        } catch (final DataIntegrityViolationException e) {
            // pl. a hallgatónak van tárgyfelvétele (idegen kulcs)
            redirectAttributes.addFlashAttribute("error",
                    "A hallgató nem törölhető, mert van tárgyfelvétele.");
        }
        return "redirect:/student";
    }

    private Student findOrNotFound(final String neptun) {
        return repository.findById(neptun)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nincs ilyen hallgató: " + neptun));
    }
}
