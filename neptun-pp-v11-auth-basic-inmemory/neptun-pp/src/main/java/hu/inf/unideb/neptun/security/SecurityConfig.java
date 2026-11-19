package hu.inf.unideb.neptun.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

/**
 * HTTP Basic autentikáció a backend MINDEN útvonalára, memóriában tárolt felhasználókkal.
 * <p>
 * A böngésző bejelentkező ablaka csak akkor jön fel, ha a 401-es válaszban
 * "WWW-Authenticate: Basic" fejléc van. A Spring Security ezt NEM küldi, ha a kérésben
 * "X-Requested-With: XMLHttpRequest" fejléc van (ezt az Angular interceptor teszi bele).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(final HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        // törölni csak az ADMIN szerepkör tud (a többiek 403-at kapnak)
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
                        // minden más útvonal (a /db H2 konzol is): bármely bejelentkezett felhasználó
                        .anyRequest().authenticated())
                .httpBasic(Customizer.withDefaults())
                // nincs session és süti → CSRF-védelem sem kell
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // a H2 konzol <frame>-eket használ
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .build();
    }

    /** A felhasználók a memóriában: újraindításkor ugyanezek jönnek létre. */
    @Bean
    public UserDetailsService userDetailsService(final PasswordEncoder passwordEncoder) {
        return new InMemoryUserDetailsManager(
                User.withUsername("user")
                        .password(passwordEncoder.encode("user"))
                        .roles("USER")
                        .build(),
                User.withUsername("admin")
                        .password(passwordEncoder.encode("admin"))
                        .roles("USER", "ADMIN")
                        .build());
    }

    /** Alapértelmezetten BCrypt; a hash elé írja az algoritmust: {bcrypt}$2a$10$... */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
