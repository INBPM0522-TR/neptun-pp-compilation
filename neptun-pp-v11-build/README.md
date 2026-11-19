# Neptun++ v11-build – óraterv: frontend és backend egyetlen deployolható WAR-ban (40 perc)

**Kiinduló állapot:** a `neptun-pp-v10` mappa (navbar, EmptyRow, rendezhető fejlécek v1/v2/v3).
**Végállapot:** ez a mappa (`neptun-pp-v11-build`).

**Az óra célja:** eddig két szerver futott (Angular dev szerver a 4200-as, Spring Boot a
8083-as porton), és a `proxy.conf.json` kötötte össze őket. Élesben ehelyett **egyetlen
`neptun-pp.war`** fájlt szeretnénk, amiben benne van a lebuildelt Angular alkalmazás is, és:

* egy külső **Tomcatre** deployolható (pl. a Tomcat Manageren keresztül), vagy
* önállóan is elindítható: `java -jar neptun-pp.war`.

A build kétféleképpen futtatható:

| Parancs | Mit csinál? |
|---|---|
| `mvn package` | csak a WAR-t készíti el, a `src/main/resources/static` mappa **aktuális** tartalmával (pl. egy korábbi frontend builddel, vagy anélkül) |
| `mvn package -PbuildNg` | előbb **lebuildeli a szomszédos `neptun-pp-ng` Angular projektet**, bemásolja a `static` mappába, és utána készíti el a WAR-t |

A `buildNg` profilhoz **nem kell telepített Node.js**: a `frontend-maven-plugin` letölti a
megadott verziót (egyszer, utána a `~/.m2`-ből veszi).

| # | Téma | Idő |
|---|---|---|
| 1 | Egy alkalmazás, egy cím: context path, relatív URL-ek | 5' |
| 2 | Backend: WAR csomagolás, `SpringBootServletInitializer`, SPA útvonalak | 10' |
| 3 | Frontend: relatív API-címek, proxy | 5' |
| 4 | A `pom.xml`: `buildNg` profil a `frontend-maven-plugin`-nel | 15' |
| 5 | Build, futtatás, deploy | 5' |
| | **Összesen** | **40'** |

**Hogyan olvasd a kódrészleteket?** Minden kódrészlet előtt van egy rövid magyarázat, majd
egy **Hova:** sor, ami megmondja, melyik fájlba kerül a kód, és hogy új fájlról van-e szó,
vagy egy meglévő fájl teljes tartalmát kell lecserélni.

---

## 1. Egy alkalmazás, egy cím (5')

Egy Tomcaton több alkalmazás is futhat; mindegyik a saját **context path**-ja alatt, ami
alapból a WAR fájl neve: a `neptun-pp.war` a `http://szerver:8080/neptun-pp/` címre kerül.
Ugyanez lesz a cím `java -jar`-ral indítva is, ha a Spring Bootban beállítjuk ugyanezt a
context path-t:

```
http://localhost:8083/neptun-pp/                 → index.html (Angular)
http://localhost:8083/neptun-pp/main-XXXX.js     → az Angular build fájljai (static mappa)
http://localhost:8083/neptun-pp/api/student      → REST API
http://localhost:8083/neptun-pp/student/ABC123   → index.html (az Angular router dönt)
http://localhost:8083/neptun-pp/db               → H2 konzol
```

Ebből három teendő következik:

1. az Angularnak tudnia kell, hogy nem a `/` alatt fut: **`--base-href=/neptun-pp/`** a
   buildnél (ebből lesz az `index.html` `<base href>`-je);
2. az API-hívások **relatívak** legyenek (`api/student`, és ne `/api/student`), hogy a böngésző a
   `<base href>`-hez képest oldja fel őket (`/neptun-pp/api/student`);
3. a backend az Angular útvonalaira (pl. `/student/ABC123`, oldalfrissítéskor vagy közvetlen
   linknél) is az `index.html`-t adja vissza, különben 404 lenne (2.3).

---

## 2. Backend: WAR csomagolás (10')

### 2.1 `SpringBootServletInitializer`

`java -jar`-ral a `main()` metódus indítja az alkalmazást, egy beágyazott Tomcattel. Egy
külső Tomcat viszont nem hív `main()`-t: a WAR-ban egy `ServletContainerInitializer`-t keres.
A `SpringBootServletInitializer` ilyen, és a `configure()` metódusában adjuk meg neki, melyik
osztály az alkalmazás.

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/Application.java` – a fájl **teljes tartalmát** cseréld le erre

```java
package hu.inf.unideb.neptun;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

/**
 * java -jar neptun-pp.war → main() (beágyazott Tomcat)
 * külső Tomcat → SpringBootServletInitializer.configure() (a Tomcat indítja)
 */
@SpringBootApplication
public class Application
        extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(
                Application.class,
                args
        );
    }

    @Override
    protected SpringApplicationBuilder configure(final SpringApplicationBuilder builder) {
        return builder.sources(Application.class);
    }
}
```

### 2.2 Context path

`java -jar`-ral a beágyazott Tomcat alapból a `/` alatt futna; ugyanazt a `/neptun-pp` context
path-t állítjuk be, mint amit a külső Tomcat a WAR nevéből adna. (Külső Tomcatnél ezt a
beállítást a Spring figyelmen kívül hagyja, ott a fájlnév dönt.)

**Hova:** `neptun-pp/src/main/resources/application.yml` – a fájl **teljes tartalmát** cseréld le erre

```yaml
server:
  port: 8083
  servlet:
    # ugyanaz, mint a WAR neve: külső Tomcaton is /neptun-pp alatt fut
    context-path: /neptun-pp
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
```

### 2.3 SPA útvonalak

A `src/main/resources/static` mappa tartalmát a Spring Boot magától kiszolgálja
(`/neptun-pp/index.html`, `/neptun-pp/main-XXXX.js`, ...), a `/neptun-pp/` címre pedig az
`index.html`-t adja. Az Angular útvonalai (`/student`, `/student/ABC123`) viszont nem
létező fájlok: ha a felhasználó frissíti az oldalt, vagy egy linkről érkezik, a szerver 404-et
adna. Ezekre az útvonalakra **továbbítjuk (forward)** a kérést az `index.html`-re: az URL
a böngészőben nem változik, az Angular router pedig a címből tudja, mit mutasson.

**Hova:** `neptun-pp/src/main/java/hu/inf/unideb/neptun/web/SpaController.java` – **új fájl**

```java
package hu.inf.unideb.neptun.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Az Angular útvonalai nem létező fájlok: oldalfrissítésnél vagy közvetlen linknél a
 * szerver 404-et adna. Ezekre az index.html-t adjuk vissza (forward: az URL nem változik),
 * a többit (melyik oldal látszik) az Angular router intézi.
 * <p>
 * Ha az Angular kap egy új útvonalat (app.routes.ts), ide is fel kell venni!
 */
@Controller
public class SpaController {

    @GetMapping({"/student", "/student/{*rest}"})
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
```

> A `{*rest}` a `/student/` utáni teljes útvonalat illeszti (`/student/create`,
> `/student/ABC123`). A `forward:/index.html` a context path-on belül értendő.

---

## 3. Frontend: relatív API-címek, proxy (5')

A `/api/student` a szerver gyökeréhez képest értendő (`http://localhost:8083/api/student`),
az `api/student` viszont a `<base href>`-hez képest (`http://localhost:8083/neptun-pp/api/student`).
Fejlesztés közben (`ng serve`) a base href `/`, így ott továbbra is `/api/student` lesz belőle.

**Hova:** `neptun-pp-ng/src/app/_service/student-client.ts` – a fájl **teljes tartalmát** cseréld le erre

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student } from '../_model/student';

@Injectable({
  providedIn: 'root',
})
export class StudentClient {
  private readonly httpClient: HttpClient = inject(HttpClient);
  /** RELATÍV cím (nincs / az elején): a <base href>-hez képest értendő, pl. /neptun-pp/api/student */
  private readonly baseUrl = 'api/student';

  public findAll(): Observable<Student[]> {
    return this.httpClient.get<Student[]>(this.baseUrl);
  }

  public findOne(neptun: string): Observable<Student> {
    return this.httpClient.get<Student>(`${this.baseUrl}/${neptun}`);
  }

  public createOne(student: Student): Observable<Student> {
    return this.httpClient.post<Student>(this.baseUrl, student);
  }

  public updateOne(student: Student): Observable<Student> {
    return this.httpClient.put<Student>(this.baseUrl, student);
  }

  public deleteOne(neptun: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseUrl}/${neptun}`);
  }
}
```

A backend most a `/neptun-pp` alatt fut, ezért a fejlesztői proxynak is oda kell küldenie a
kéréseket: a `target` végére írt útvonal a kérés útvonala elé kerül
(`/api/student` → `http://localhost:8083/neptun-pp/api/student`).

**Hova:** `neptun-pp-ng/proxy.conf.json` – a fájl **teljes tartalmát** cseréld le erre

```json
{
  "/api/**": {
    "target": "http://localhost:8083/neptun-pp",
    "changeOrigin": true
  }
}
```

Fejlesztés közben tehát semmi nem változik: `mvn spring-boot:run` + `npm start`, és a
`http://localhost:4200`.

---

## 4. A `pom.xml`: `buildNg` profil (15')

A változások:

* **`<packaging>war</packaging>`**, és a `<finalName>` miatt a fájl neve `neptun-pp.war`
  (verziószám nélkül, hogy a context path is `neptun-pp` legyen);
* **`spring-boot-starter-tomcat` `provided`** scope-pal: a külső Tomcatben már benne van, ne
  kerüljön a `WEB-INF/lib`-be (ütközne vele). A `spring-boot-maven-plugin` `repackage` célja
  a `WEB-INF/lib-provided` mappába teszi, így `java -jar`-ral mégis elindul;
* **`buildNg` profil**: csak `-PbuildNg` kapcsolóval aktív. A `generate-resources` fázisban,
  ebben a sorrendben (egy fázison belül a pluginek a pom-beli sorrendjükben futnak):
  1. `maven-clean-plugin`: kiüríti a `src/main/resources/static` mappát (a lebuildelt fájlok
     neve minden buildnél más hash-t kap, a régiek ne maradjanak ott);
  2. `frontend-maven-plugin`: letölti a Node.js-t (a `target` mappába), majd a
     `../neptun-pp-ng` mappában lefuttatja az `npm install`-t és az
     `npm run build -- --configuration=production --base-href=/neptun-pp/` parancsot;
  3. `maven-resources-plugin`: a `dist/neptun-pp-ng/browser` tartalmát bemásolja a
     `src/main/resources/static` mappába.

  Ezután a szokásos lépések jönnek: a `process-resources` a `static` mappát (a többi
  resource-szal együtt) a `target/classes`-ba másolja, a `package` pedig elkészíti a WAR-t.
  Mivel a lebuildelt frontend a `src/main/resources/static`-ban marad, egy későbbi sima
  `mvn package` is beleteszi.
* a **javafaker** a régi, androidos `snakeyaml`-t hozná magával. `mvn spring-boot:run`-nal ez
  a classpath sorrendje miatt nem okoz gondot, a WAR-ban viszont a Spring Boot induláskor
  elszáll (`NoSuchMethodError: ...LoaderOptions.setMaxAliasesForCollections`). Ezért kizárjuk,
  és a Spring Boot által kezelt 2.x-es verzió marad (a javafaker azzal is működik).

**Hova:** `neptun-pp/pom.xml` – a fájl **teljes tartalmát** cseréld le erre

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- Source: https://mvnrepository.com/artifact/org.springframework.boot/spring-boot-starter-parent -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.1.2</version>
        <relativePath></relativePath>
    </parent>

    <groupId>org.example</groupId>
    <artifactId>neptun-pp</artifactId>
    <version>1.0-SNAPSHOT</version>
    <!-- külső Tomcatre deployolható webalkalmazás (java -jar-ral is indítható) -->
    <packaging>war</packaging>

    <properties>
        <maven.compiler.source>25</maven.compiler.source>
        <maven.compiler.target>25</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <!-- a WAR neve = a context path (application.yml: server.servlet.context-path) -->
        <context-name>neptun-pp</context-name>
        <!-- buildNg: a szomszédos Angular projekt -->
        <frontend.dir>${project.basedir}/../${project.artifactId}-ng</frontend.dir>
        <static.dir>${project.basedir}/src/main/resources/static</static.dir>
    </properties>

    <dependencies>
        <!-- Source: https://mvnrepository.com/artifact/org.springframework.boot/spring-boot-starter-web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc</artifactId>
        </dependency>
        <!-- WAR: a Tomcatet a külső szerver adja, ne kerüljön a WEB-INF/lib-be
             (java -jar-hoz a repackage a WEB-INF/lib-provided-be teszi) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
            <scope>provided</scope>
        </dependency>
        <!-- Source: https://mvnrepository.com/artifact/org.springframework.boot/spring-boot-starter-web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <!-- Spring Boot 4: a H2 webkonzol (/db) külön modulba került -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-h2console</artifactId>
        </dependency>
        <!-- Hibernate Validator: @NotBlank, @Size, @NotNull, @Valid -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <!-- Source: https://mvnrepository.com/artifact/commons-io/commons-io -->
        <dependency>
            <groupId>commons-io</groupId>
            <artifactId>commons-io</artifactId>
            <version>2.20.0</version>
            <scope>compile</scope>
        </dependency>
        <!-- Source: https://mvnrepository.com/artifact/com.h2database/h2 -->
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        <!-- Source: https://mvnrepository.com/artifact/org.projectlombok/lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>${lombok.version}</version>
        </dependency>
        <dependency>
            <groupId>com.github.javafaker</groupId>
            <artifactId>javafaker</artifactId>
            <version>1.0.2</version>
            <!-- egy régi (android) snakeyaml-t hozna, ami a WAR-ban ütközik a Spring Boot 2.x-es
                 snakeyaml-jével (NoSuchMethodError: LoaderOptions.setMaxAliasesForCollections) -->
            <exclusions>
                <exclusion>
                    <groupId>org.yaml</groupId>
                    <artifactId>snakeyaml</artifactId>
                </exclusion>
            </exclusions>
        </dependency>
    </dependencies>

    <build>
        <!-- neptun-pp.war (verziószám nélkül) → a Tomcaton /neptun-pp lesz a context path -->
        <finalName>${context-name}</finalName>
        <plugins>
            <!-- JDK 23+: a javac magától nem futtatja az annotációfeldolgozókat, a Lombokot meg kell adni -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                            <version>${lombok.version}</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
            <!-- mvn spring-boot:run, valamint a futtatható WAR (repackage) -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>

    <profiles>
        <!--
            mvn package -PbuildNg: lebuildeli a szomszédos ../neptun-pp-ng Angular projektet
            (a plugin által letöltött Node.js-szel), bemásolja a src/main/resources/static
            mappába, és úgy készül el a WAR.
            Profil nélkül (mvn package) csak a WAR készül, a static mappa aktuális tartalmával.
        -->
        <profile>
            <id>buildNg</id>
            <build>
                <plugins>
                    <!-- 1. a static mappa kiürítése (a fájlnevek hash-e minden buildnél más) -->
                    <plugin>
                        <groupId>org.apache.maven.plugins</groupId>
                        <artifactId>maven-clean-plugin</artifactId>
                        <executions>
                            <execution>
                                <id>clean the static folder</id>
                                <phase>generate-resources</phase>
                                <goals>
                                    <goal>clean</goal>
                                </goals>
                                <configuration>
                                    <excludeDefaultDirectories>true</excludeDefaultDirectories>
                                    <filesets>
                                        <fileset>
                                            <directory>${static.dir}</directory>
                                        </fileset>
                                    </filesets>
                                </configuration>
                            </execution>
                        </executions>
                    </plugin>
                    <!-- 2. Node.js letöltése, npm install, ng build (production, /neptun-pp/ base href) -->
                    <!-- https://mvnrepository.com/artifact/com.github.eirslett/frontend-maven-plugin -->
                    <plugin>
                        <groupId>com.github.eirslett</groupId>
                        <artifactId>frontend-maven-plugin</artifactId>
                        <version>1.15.4</version>
                        <configuration>
                            <workingDirectory>${frontend.dir}</workingDirectory>
                            <installDirectory>${project.build.directory}</installDirectory>
                            <nodeVersion>v24.22.0</nodeVersion>
                            <!-- a Node.js-hez tartozó npm -->
                            <npmVersion>provided</npmVersion>
                        </configuration>
                        <executions>
                            <execution>
                                <id>install node and npm</id>
                                <goals>
                                    <goal>install-node-and-npm</goal>
                                </goals>
                                <phase>generate-resources</phase>
                            </execution>
                            <execution>
                                <id>npm install</id>
                                <goals>
                                    <goal>npm</goal>
                                </goals>
                                <phase>generate-resources</phase>
                                <configuration>
                                    <arguments>install --no-audit --no-fund</arguments>
                                </configuration>
                            </execution>
                            <execution>
                                <id>ng build</id>
                                <goals>
                                    <goal>npm</goal>
                                </goals>
                                <phase>generate-resources</phase>
                                <configuration>
                                    <arguments>run build -- --configuration=production --base-href=/${context-name}/</arguments>
                                </configuration>
                            </execution>
                        </executions>
                    </plugin>
                    <!-- 3. a lebuildelt Angular alkalmazás bemásolása a static mappába -->
                    <plugin>
                        <groupId>org.apache.maven.plugins</groupId>
                        <artifactId>maven-resources-plugin</artifactId>
                        <executions>
                            <execution>
                                <id>copy the Angular build to static</id>
                                <phase>generate-resources</phase>
                                <goals>
                                    <goal>copy-resources</goal>
                                </goals>
                                <configuration>
                                    <outputDirectory>${static.dir}</outputDirectory>
                                    <resources>
                                        <resource>
                                            <directory>${frontend.dir}/dist/${project.artifactId}-ng/browser</directory>
                                        </resource>
                                    </resources>
                                </configuration>
                            </execution>
                        </executions>
                    </plugin>
                </plugins>
            </build>
        </profile>
    </profiles>

</project>
```

> A `src/main/resources/static` tartalma generált fájl: a backend `.gitignore`-jába bekerült
> (`src/main/resources/static/`), hogy ne kerüljön a gitbe.

---

## 5. Build, futtatás, deploy (5')

```bash
cd neptun-pp

# frontend + backend → target/neptun-pp.war
mvn clean package -PbuildNg

# csak a backend (a static mappában lévő, korábban lebuildelt frontenddel)
mvn clean package

# önállóan, beágyazott Tomcattel: http://localhost:8083/neptun-pp/
java -jar target/neptun-pp.war
```

Az első `-PbuildNg` build lassabb (letölti a Node.js-t és az npm csomagokat), a továbbiak
gyorsabbak.

**Deploy külső Tomcatre:** a Spring Boot 4 Jakarta EE 11-re épül, ezért **Tomcat 11** kell
(Tomcat 10 vagy régebbi nem jó).

* a `target/neptun-pp.war` fájlt a Tomcat `webapps` mappájába másolva a Tomcat magától
  kicsomagolja és elindítja: `http://localhost:8080/neptun-pp/`;
* vagy a **Tomcat Manager** webes felületén (`http://szerver:8080/manager/html`) →
  *WAR file to deploy* → *Deploy*.

Ellenőrzés:

1. `http://localhost:8083/neptun-pp/`: a hallgatólista, proxy és `npm start` nélkül;
2. nyiss meg egy hallgatót, és frissítsd az oldalt (F5): a `SpaController` miatt nem 404;
3. a fejlesztői eszközök Network fülén az API-hívások címe `/neptun-pp/api/student`;
4. a WAR tartalma: `jar tf target/neptun-pp.war | grep static`.

---

## Függelék

### Gyakori hibák

| Hiba | Ok |
|---|---|
| üres oldal, a konzolban 404 a `main-XXXX.js`-re | a frontend `--base-href` nélkül (vagy rosszal) készült |
| az oldal betölt, de az API-hívások 404-et kapnak (`/api/student`) | maradt egy `/`-rel kezdődő, abszolút API-cím |
| F5 után 404 egy Angular útvonalon | az útvonal nincs felvéve a `SpaController`-ben |
| `npm install` hiba a `-PbuildNg` buildnél | a `neptun-pp-ng` mappa nincs a `neptun-pp` mellett, vagy nincs internet |
| a Tomcat nem indítja el (`ClassNotFoundException: jakarta...`) | régi Tomcat; Tomcat 11 kell |

### Megoldás

A lépések végeredménye ebben a mappában (`neptun-pp-v11-build`) van. A többi v11 változat
ugyanebből a v10-es állapotból indul, egymástól függetlenül.
