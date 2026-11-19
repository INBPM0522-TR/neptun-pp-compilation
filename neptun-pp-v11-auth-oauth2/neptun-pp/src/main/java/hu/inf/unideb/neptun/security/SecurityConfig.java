package hu.inf.unideb.neptun.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

/**
 * Bejelentkezés GitHubbal (OAuth 2.0 authorization code flow), a backend MINDEN útvonalára.
 * A bejelentkezés eredménye egy session (JSESSIONID süti), ezért CSRF-védelem is kell.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            final HttpSecurity http,
            @Value("${app.frontend-url}") final String frontendUrl) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().authenticated())
                // /oauth2/authorization/github → GitHub → /login/oauth2/code/github → frontend
                .oauth2Login(oauth2 -> oauth2
                        .defaultSuccessUrl(frontendUrl, true))
                // az /api/** kérésekre bejelentkezés nélkül 401 (és nem 302 a GitHubra)
                .exceptionHandling(exceptions -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                PathPatternRequestMatcher.pathPattern("/api/**")))
                // POST /logout → 200 (az Angular hívja, nem kell átirányítás)
                .logout(logout -> logout
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler()))
                // XSRF-TOKEN süti → X-XSRF-TOKEN fejléc (az Angular HttpClient magától kezeli)
                .csrf(csrf -> csrf
                        .spa()
                        .ignoringRequestMatchers("/db/**"))
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
                // a H2 konzol <frame>-eket használ
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .build();
    }
}
