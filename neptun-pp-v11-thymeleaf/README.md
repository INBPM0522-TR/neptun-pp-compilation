# Neptun++ v11-thymeleaf – óraterv: szerveroldali renderelés Thymeleaffel (50 perc)

**Kiinduló állapot:** a `neptun-pp-v10` mappa (navbar, EmptyRow, rendezhető fejlécek, hallgató
listázása és szerkesztése Angularban).
**Végállapot:** ez a mappa (`neptun-pp-v11-thymeleaf`). **Nincs Angular frontend** (a
`neptun-pp-ng` mappa törölhető): minden oldalt a Spring Boot backend állít elő, **szerveroldalon**.

**Az óra célja:** ugyanazt a felületet (navbar, rendezhető hallgatólista, „nincs adat” sor,
létrehozás, szerkesztés validációval, törlés) **Thymeleaf** sablonokkal megírni, és összevetni
a két világot:

| | SPA (Angular, v10) | SSR (Thymeleaf, v11-thymeleaf) |
|---|---|---|
| Ki állítja elő a HTML-t? | a böngésző (JavaScript) | a szerver, minden kérésre |
| Mi megy át a hálózaton? | egyszer a JS, utána JSON | minden oldalnál a teljes HTML |
| Navigáció | oldalbetöltés nélkül (router) | linkek, űrlapok → új oldal |
| Rendezés állapota | komponens mezője | URL: `/student?orderBy=name&desc=true` |
| Újrafelhasználható elem | komponens (`th[sortable-v1]`, `tr[empty]`) | **fragment** (`th:replace`) |
| Validáció | backend 400 → JSON → megjelenítés | `@Valid` + `BindingResult` → ugyanaz az oldal hibákkal |
| Proxy, CORS, két szerver | kell | nem kell: egy szerver, egy port |
| JavaScript nélkül | nem megy | megy |

| # | Téma | Idő |
|---|---|---|
| 1 | Függőség, konfiguráció, üzenetek | 5' |
| 2 | Fragmentek: fej, navbar, rendezhető fejléc, üres sor, üzenetsáv | 10' |
| 3 | A hallgatólista: controller és sablon | 10' |
| 4 | Létrehozás és szerkesztés: űrlap, validáció, PRG | 15' |
| 5 | Törlés és hibaoldal | 10' |
| | **Összesen** | **50'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni.

Futtatás (JDK 25):

```bash
cd neptun-pp && mvn spring-boot:run      # http://localhost:8083
```

A REST API (`/api/**`) változatlanul megmarad, a Thymeleaf oldalak a `/student` alatt vannak.

---

## 1. Függőség, konfiguráció, üzenetek (5')

### 1.1 Függőség

A `spring-boot-starter-thymeleaf` után a Spring a `src/main/resources/templates/*.html`
fájlokat sablonként kezeli: ha egy `@Controller` metódus egy szöveget (`"student-list"`) ad
vissza, az a `templates/student-list.html` sablon nevét jelenti.

**Hova:** `neptun-pp/pom.xml` – a `<dependencies>` közé

```xml
        <!-- Thymeleaf: szerveroldali HTML-sablonok -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-thymeleaf</artifactId>
        </dependency>
```

### 1.2 Konfiguráció

* `spring.web.error.include-message: always`: a hibaoldalon (5.2) a hiba szövege is látsszon
  (Spring Boot 3-ban még `server.error.include-message` volt a neve);
* `server.servlet.session.tracking-modes: cookie`: a session azonosítója csak sütiben
  utazzon. Alapból a Tomcat az első átirányításnál az URL-be is beírja
  (`/student;jsessionid=...`), mert még nem tudja, hogy a böngésző elfogadja-e a sütit;
* `spring.thymeleaf.cache: false`: fejlesztés közben a módosított sablon az oldal frissítése
  után azonnal látszik (IntelliJ-ben a Build → Build Project kell hozzá, újraindítás nem).

**Hova:** `neptun-pp/src/main/resources/application.yml` – a fájl **teljes tartalmát** cseréld le erre

```yaml
server:
  port: 8083
  # a session azonosítója csak sütiben utazzon, az URL-ben (;jsessionid=...) ne
  servlet.session.tracking-modes: cookie
spring:
  web.error:
    # a hibaoldalon (templates/error.html) a hiba szövege is látsszon
    include-message: always
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
  # fejlesztéshez: a sablonok módosítása újraindítás nélkül látszik
  thymeleaf:
    cache: false
```

### 1.3 Üzenetek

Az Angularos `program` pipe megfelelője: a szakkódok nevei egy `messages.properties` fájlba
kerülnek, a sablonban pedig `#{program.CS_BSC}` formában hivatkozunk rájuk. (Ez egyben a
Spring i18n alapja is: egy `messages_en.properties` mellé téve angolul is megy.)

**Hova:** `neptun-pp/src/main/resources/messages.properties` – **új fájl**

```properties
program.CS_BSC=Programtervező informatikus BSc
program.CSE_BSC=Mérnökinformatikus BSc
program.BI_BSC=Gazdaságinformatikus BSc
```

---

## 2. Fragmentek (10')

A **fragment** egy sablonrészlet, amit más sablonokba be lehet illeszteni, akár paraméterekkel
is: ez a Thymeleaf „komponense”. A `th:fragment="sortable(value, label)"` definiál, a
`th:replace="~{fragments :: sortable('name', 'Név')}"` beilleszt (és lecseréli vele a saját
elemét).

A közös részek:

* `head(title)`: a `<head>` (Bootstrap és ikonok CDN-ről, mert nincs `npm`);
* `navbar(active)`: a navbar; az aktív menüpontot paraméterként kapja (`routerLinkActive` helyett);
* `sortable(value, label)`: **rendezhető fejléc**. Nincs JavaScript: a fejléc egy **link**,
  ami az URL-be írja az új rendezést. Ha már e szerint rendezünk, megfordítja az irányt;
* `emptyRow(colSpan, entity)`: „Nincs megjeleníthető …” sor;
* `flash`: a sikeres vagy hibás művelet üzenete (lásd 4.1, `RedirectAttributes`).

A fragment a beillesztő sablon változóit (pl. `orderBy`, `desc`) is látja.

**Hova:** `neptun-pp/src/main/resources/templates/fragments.html` – **új fájl**

```html
<!DOCTYPE html>
<html lang="hu" xmlns:th="http://www.thymeleaf.org">

<!-- <head>: <head th:replace="~{fragments :: head('Hallgatók')}"></head> -->
<head th:fragment="head(title)">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title th:text="|${title} – Neptun++|">Neptun++</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
</head>

<body>

<!-- navbar: <nav th:replace="~{fragments :: navbar('student')}"></nav> -->
<nav th:fragment="navbar(active)" class="navbar bg-dark navbar-expand-lg sticky-top" data-bs-theme="dark">
  <div class="container">
    <a class="navbar-brand" th:href="@{/}">
      <img src="https://inf.unideb.hu/themes/custom/unideb_gamma/logo.svg" alt="Logo" width="30" height="24"
           class="d-inline-block align-text-top">
      Neptun++
    </a>

    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="navbarSupportedContent">
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <!-- routerLinkActive helyett: az aktív menüpontot a sablon adja meg -->
          <a class="nav-link" th:href="@{/student}"
             th:classappend="${active == 'student'} ? 'active'">Hallgatók</a>
        </li>
      </ul>
    </div>
  </div>
</nav>

<!-- rendezhető fejléc: <th th:replace="~{fragments :: sortable('name', 'Név')}"></th>
     A rendezés állapota az URL-ben van: /student?orderBy=name&desc=false -->
<th th:fragment="sortable(value, label)">
  <a class="d-block text-reset text-decoration-none"
     th:href="@{/student(orderBy=${value}, desc=${orderBy == value and !desc})}">
    <span th:text="${label}">Név</span>
    <i th:if="${orderBy == value}" class="bi float-end"
       th:classappend="${desc} ? 'bi-sort-down' : 'bi-sort-down-alt'"></i>
  </a>
</th>

<!-- "nincs adat" sor: <tr th:replace="~{fragments :: emptyRow(6, 'hallgató')}"></tr> -->
<tr th:fragment="emptyRow(colSpan, entity)">
  <th th:colspan="${colSpan}" class="table-warning">
    <div class="d-flex flex-row justify-content-center align-items-center">
      <i class="bi bi-emoji-smile-upside-down-fill me-2" style="font-size: 1.5em"></i>
      Nincs megjeleníthető [[${entity}]]!
    </div>
  </th>
</tr>

<!-- üzenetsáv a flash attribútumokhoz (success / error): <div th:replace="~{fragments :: flash}"></div> -->
<div th:fragment="flash" th:remove="tag">
  <div th:if="${success}" class="alert alert-success alert-dismissible m-2">
    <i class="bi bi-check-circle-fill me-1"></i><span th:text="${success}">Siker</span>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Bezárás"></button>
  </div>
  <div th:if="${error}" class="alert alert-danger alert-dismissible m-2">
    <i class="bi bi-exclamation-triangle-fill me-1"></i><span th:text="${error}">Hiba</span>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Bezárás"></button>
  </div>
</div>

</body>
</html>
```

> A `th:text` mindig **HTML-escape-el** (egy `<script>` nevű hallgató szövegként jelenik meg,
> nem fut le). A `[[${...}]]` ugyanez, csak szöveg közé írva.

---

## 3. A hallgatólista (10')

### 3.1 A controller

A `@Controller` (nem `@RestController`!) metódusai **sablonnevet** adnak vissza, az adatokat
pedig a `Model`-be teszik, ahonnan a sablon `${students}` néven éri el.

A rendezést most az **adatbázis** végzi (`findAll(Sort)` → `ORDER BY`), a paraméterek az URL-ből
jönnek. A mezőnevet egy fehérlistával ellenőrizzük: a felhasználó bármit beírhat az URL-be.

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/web/StudentPageController.java` – **új fájl**

```java
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
```

### 3.2 A sablon

A Thymeleaf sablon **érvényes HTML**: böngészőben közvetlenül megnyitva is látszik (a `th:*`
attribútumokat a böngésző figyelmen kívül hagyja, a példaszövegek maradnak). A szerver a
`th:*` attribútumok alapján cseréli ki a tartalmat:

| Thymeleaf | Angular megfelelő |
|---|---|
| `th:text="${student.name}"` | `{{ student.name }}` |
| `th:each="student : ${students}"` | `@for (student of students; ...)` |
| `th:if="${students.isEmpty()}"` | `@if (...)` / `@empty` |
| `th:href="@{/student/{n}(n=${student.neptun})}"` | `[routerLink]="student.neptun"` |
| `th:classappend="${...} ? 'table-danger'"` | `[class.table-danger]="..."` |
| `#{program.CS_BSC}` | `program` pipe |
| `${#temporals.format(student.created, 'yyyy-MM-dd HH:mm:ss')}` | `date` pipe |

A törlés gombja egy **POST űrlap** (egy link GET kérést küldene, és GET-tel nem módosítunk
adatot). A `confirm()` az egyetlen JavaScript: ha a felhasználó a Mégse gombot választja, az
űrlap nem küldődik el.

**Hova:** `neptun-pp/src/main/resources/templates/student-list.html` – **új fájl**

```html
<!DOCTYPE html>
<html lang="hu" xmlns:th="http://www.thymeleaf.org">
<head th:replace="~{fragments :: head('Hallgatók')}"></head>
<body>
<nav th:replace="~{fragments :: navbar('student')}"></nav>

<div class="container">
  <div class="card my-2">
    <div class="card-header text-bg-primary d-flex flex-row align-items-center">
      <span class="flex-grow-1">Hallgatók</span>
      <!-- az ikon mindig látszik, a felirat csak md mérettől (d-none d-md-inline) -->
      <a class="btn btn-sm btn-dark m-1" th:href="@{/student/create}" title="Létrehozás">
        <i class="bi bi-plus-lg"></i>
        <span class="d-none d-md-inline ms-1">Létrehozás</span>
      </a>
    </div>

    <div th:replace="~{fragments :: flash}"></div>

    <div class="card-body p-0 table-responsive">
      <table class="table table-striped table-hover m-0">
        <thead class="table-dark">
        <tr>
          <!-- rendezhető fejlécek: linkek, a rendezés az URL-ben van -->
          <th th:replace="~{fragments :: sortable('neptun', 'Neptun-kód')}"></th>
          <th th:replace="~{fragments :: sortable('name', 'Név')}"></th>
          <th th:replace="~{fragments :: sortable('program', 'Szak')}"></th>
          <th th:replace="~{fragments :: sortable('created', 'Létrehozva')}"></th>
          <th th:replace="~{fragments :: sortable('updated', 'Módosítva')}"></th>
          <th>Műveletek</th>
        </tr>
        </thead>
        <tbody>
        <tr th:each="student : ${students}"
            th:classappend="${student.program.name() == 'BI_BSC'} ? 'table-danger'">
          <td><code class="badge text-bg-dark" th:text="${student.neptun}">ABC123</code></td>
          <td th:text="${student.name}">Minta Márton</td>
          <td th:text="#{'program.' + ${student.program}}">Programtervező informatikus BSc</td>
          <td th:text="${#temporals.format(student.created, 'yyyy-MM-dd HH:mm:ss')}">2026-01-01 12:00:00</td>
          <td th:text="${#temporals.format(student.updated, 'yyyy-MM-dd HH:mm:ss')}">2026-01-01 12:00:00</td>
          <td>
            <!-- törlés: POST űrlap (GET-tel nem módosítunk adatot!) -->
            <form class="d-inline" method="post"
                  th:action="@{/student/{neptun}/delete(neptun=${student.neptun})}"
                  th:data-name="${student.name}"
                  onsubmit="return confirm('Biztosan törlöd ' + this.dataset.name + ' hallgatót?')">
              <button type="submit" class="btn btn-sm btn-outline-danger m-1" title="Törlés">
                <i class="bi bi-trash"></i>
                <span class="d-none d-md-inline ms-1">Törlés</span>
              </button>
            </form>
            <a class="btn btn-sm btn-outline-primary m-1" title="Módosítás"
               th:href="@{/student/{neptun}(neptun=${student.neptun})}">
              <i class="bi bi-pencil"></i>
              <span class="d-none d-md-inline ms-1">Módosítás</span>
            </a>
          </td>
        </tr>
        <!-- üres lista: a th:if a th:block-on van, mert a th:replace "erősebb" a th:if-nél -->
        <th:block th:if="${students.isEmpty()}">
          <tr th:replace="~{fragments :: emptyRow(6, 'hallgató')}"></tr>
        </th:block>
        </tbody>
      </table>
    </div>
  </div>
</div>
</body>
</html>
```

> A hallgató nevét `data-name` attribútumba tesszük, és onnan olvassuk: így egy `'` karaktert
> tartalmazó név sem töri el (és nem is injektálhat) a JavaScriptet.

Próba: `http://localhost:8083/student`, kattints a fejlécekre, és figyeld az URL-t. Nézd meg az
oldal forrását is (Ctrl+U): a teljes táblázat ott van, nincs `<app-root>`.

---

## 4. Létrehozás és szerkesztés (15')

### 4.1 Post/Redirect/Get

A `save()` (3.1) a következő mintát követi:

1. **POST** `/student/save` az űrlap adataival. A Spring a mezőket a `Student` objektumba
   köti (`@ModelAttribute`), a `@Valid` ellenőrzi őket (`@NotBlank`, `@Size`, `@NotNull` a
   `Student` entitáson), az eredmény pedig a `BindingResult`-ba kerül.
2. **Hibánál** nincs átirányítás: ugyanazt a sablont adjuk vissza, és benne lesznek a beírt
   értékek és a mezőnkénti hibák (`th:errors`).
3. **Sikernél** `redirect:/student/ABC123` → a böngésző egy **GET** kéréssel tölti be a
   szerkesztő oldalt. Ha ezután a felhasználó frissít (F5), a GET ismétlődik, nem a mentés.
   (Átirányítás nélkül a böngésző megkérdezné, hogy újra elküldje-e az űrlapot.)
4. Az üzenet (`Sikeres mentés!`) az átirányításon át a **flash attribútummal** jut el: a
   Spring a sessionben tárolja, és az átirányítás utáni első kérés után törli.

### 4.2 A sablon

* `th:object="${student}"`: az űrlap „háttérobjektuma”; a `*{name}` ennek a mezőjére hivatkozik;
* `th:field="*{name}"`: beállítja az `id`, `name` és `value` attribútumot (selectnél a
  kiválasztott opciót is);
* `th:errors="*{name}"`: a mező hibaüzenetei; a `#fields.hasErrors('name')` igaz, ha van ilyen;
* a Neptun-kód **rejtett mezőben** megy vissza: üres → új hallgató, különben módosítás;
* `th:with="isNew=..."`: helyi változó a sablonban. Az `#strings.isEmpty` azért kell, mert a
  Thymeleafben az **üres szöveg igaz értéknek** számít (csak a `null`, `"false"`, `"off"`,
  `"no"` hamis), validációs hiba után pedig a rejtett mezőből `""` jön vissza.

A hibaüzenetek (pl. „nem lehet üres”) a Hibernate Validatortól jönnek, a böngésző
`Accept-Language` fejléce szerinti nyelven.

**Hova:** `neptun-pp/src/main/resources/templates/student-edit.html` – **új fájl**

```html
<!DOCTYPE html>
<html lang="hu" xmlns:th="http://www.thymeleaf.org">
<head th:replace="~{fragments :: head(${#strings.isEmpty(student.neptun)} ? 'Új hallgató' : ${student.name})}"></head>
<body>
<nav th:replace="~{fragments :: navbar('student')}"></nav>

<!-- új hallgató: üres Neptun-kód (az üres szöveg a Thymeleafben IGAZ értéknek számít!) -->
<div class="container" th:with="isNew=${#strings.isEmpty(student.neptun)}">
  <div class="card my-2">
    <div class="card-header text-bg-primary"
         th:text="${isNew} ? 'Új hallgató' : |${student.name} szerkesztése|">Új hallgató</div>

    <div th:replace="~{fragments :: flash}"></div>

    <!-- th:object: az űrlap háttérobjektuma, a *{...} ennek a mezőire hivatkozik -->
    <form class="card-body" method="post" th:action="@{/student/save}" th:object="${student}">
      <!-- üres → létrehozás, különben módosítás -->
      <input type="hidden" th:field="*{neptun}">

      <div class="form-floating my-2" th:unless="${isNew}">
        <input id="neptunView" class="form-control" th:value="*{neptun}" disabled>
        <label for="neptunView">Neptun-kód</label>
      </div>

      <div class="form-floating my-2">
        <input class="form-control" th:field="*{name}" th:errorclass="is-invalid">
        <label for="name">Név</label>
        <div class="invalid-feedback" th:errors="*{name}">nem lehet üres</div>
      </div>

      <div class="form-floating my-2">
        <select class="form-select" th:field="*{program}" th:errorclass="is-invalid">
          <option value="">Válassz szakot</option>
          <option th:each="program : ${programs}"
                  th:value="${program}"
                  th:text="#{'program.' + ${program}}">Programtervező informatikus BSc</option>
        </select>
        <label for="program">Szak</label>
        <div class="invalid-feedback" th:errors="*{program}">nem lehet null</div>
      </div>

      <button type="submit" class="btn btn-outline-primary w-100"
              th:title="${isNew} ? 'Létrehozás' : 'Mentés'">
        <i class="bi" th:classappend="${isNew} ? 'bi-plus-lg' : 'bi-floppy'"></i>
        <span class="d-none d-md-inline ms-1" th:text="${isNew} ? 'Létrehozás' : 'Mentés'">Mentés</span>
      </button>
    </form>
  </div>
</div>
</body>
</html>
```

> A `th:errorclass="is-invalid"` csak hibás mezőnél adja hozzá az `is-invalid` osztályt, a
> Bootstrap pedig ilyenkor mutatja az utána következő `invalid-feedback` elemet.

Próba: hozz létre egy hallgatót üres névvel (a mező piros, alatta a hibaüzenet), majd egy jóval;
a mentés után nyomj F5-öt.

---

## 5. Törlés és hibaoldal (10')

### 5.1 Törlés

A `delete()` (3.1) a `DataIntegrityViolationException`-t elkapja: ha a hallgatónak van
tárgyfelvétele, az idegen kulcs miatt nem törölhető, ilyenkor hibaüzenet megy a flash
attribútumban. Próba: a H2 konzolban (`/db`, JDBC URL: `jdbc:h2:mem:testdb`) keress egy
hallgatót az `ENROLLMENT` táblában, és töröld a listából.

### 5.2 Hibaoldal

Ha egy kérés kivétellel végződik (pl. `ResponseStatusException(NOT_FOUND)` egy nem létező
Neptun-kódnál), a Spring Boot a `templates/error.html` sablont rendereli, és átadja neki a
`status`, `error` és `message` értékeket.

**Hova:** `neptun-pp/src/main/resources/templates/error.html` – **új fájl**

```html
<!DOCTYPE html>
<html lang="hu" xmlns:th="http://www.thymeleaf.org">
<head th:replace="~{fragments :: head('Hiba')}"></head>
<body>
<nav th:replace="~{fragments :: navbar('')}"></nav>

<div class="container">
  <div class="card my-2">
    <div class="card-header text-bg-danger" th:text="|${status} ${error}|">404 Not Found</div>
    <div class="card-body">
      <p th:text="${message}">Nincs ilyen hallgató.</p>
      <a class="btn btn-outline-primary" th:href="@{/student}">
        <i class="bi bi-arrow-left me-1"></i>Vissza a hallgatókhoz
      </a>
    </div>
  </div>
</div>
</body>
</html>
```

Próba: `http://localhost:8083/student/NINCSILYEN`.

---

## Függelék

### Mi maradt ki?

* **CSRF:** a session süti miatt egy idegen oldal is el tudná küldeni a törlő űrlapot a
  felhasználó nevében. Spring Security használatakor a Thymeleaf a `th:action`-ös űrlapokba
  automatikusan beteszi a CSRF tokent (lásd `v11-auth-*`).
* **Részleges frissítés:** minden kattintás teljes oldalbetöltés. Ha ez zavar, a
  [htmx](https://htmx.org) könyvtárral egy-egy fragment cserélhető JavaScript írása nélkül.

### Megoldás

A lépések végeredménye ebben a mappában (`neptun-pp-v11-thymeleaf`) van. A többi v11 változat
ugyanebből a v10-es állapotból indul, egymástól függetlenül.
