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
