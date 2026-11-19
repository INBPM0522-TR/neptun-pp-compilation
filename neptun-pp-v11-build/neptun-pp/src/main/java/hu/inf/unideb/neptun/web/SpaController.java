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
