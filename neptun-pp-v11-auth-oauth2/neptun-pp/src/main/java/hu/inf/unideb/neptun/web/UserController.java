package hu.inf.unideb.neptun.web;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A bejelentkezett GitHub felhasználó adatai. Bejelentkezés nélkül ide el sem jut a kérés:
 * a Spring Security már előtte 401-et ad.
 */
@RestController
public class UserController {

    public record UserInfo(String login, String name, String avatarUrl) {
    }

    @GetMapping("/api/user")
    public UserInfo me(@AuthenticationPrincipal final OAuth2User user) {
        return new UserInfo(
                user.getAttribute("login"),
                user.getAttribute("name"),
                user.getAttribute("avatar_url"));
    }
}
