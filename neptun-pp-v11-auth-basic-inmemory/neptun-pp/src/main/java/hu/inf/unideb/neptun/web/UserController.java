package hu.inf.unideb.neptun.web;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** A bejelentkezett felhasználó adatai, pl. { "name": "admin", "roles": ["ROLE_ADMIN", "ROLE_USER"] } */
@RestController
public class UserController {

    public record UserInfo(String name, List<String> roles) {
    }

    @GetMapping("/api/user")
    public UserInfo me(final Authentication authentication) {
        return new UserInfo(
                authentication.getName(),
                authentication.getAuthorities()
                        .stream()
                        .map(GrantedAuthority::getAuthority)
                        // csak a szerepkörök (a Spring Security 7 pl. FACTOR_PASSWORD-öt is ad)
                        .filter(authority -> authority.startsWith("ROLE_"))
                        .sorted()
                        .toList());
    }
}
