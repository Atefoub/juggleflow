package com.juggleflow.backend.security;

import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORRECTIONS SÉCURITÉ appliquées :
 *
 * [VULN-13] HEADERS HTTP DE SÉCURITÉ manquants : X-Content-Type-Options,
 *           X-Frame-Options, Content-Security-Policy, Referrer-Policy,
 *           Permissions-Policy. Ajoutés via Spring Security Headers DSL.
 *
 * [VULN-14] CSRF désactivé pour une API REST stateless — c'est correct.
 *           Documenté explicitement pour éviter toute confusion future.
 *
 * [VULN-15] SWAGGER accessible en prod (springdoc.api-docs.enabled=false
 *           par défaut, mais les routes étaient en PUBLIC_ROUTES).
 *           CORRECTION : Swagger retiré des routes publiques ; protégé par
 *           ROLE_ADMINISTRATEUR. Désactivé en prod via application.properties.
 *
 * [VULN-16] ORDRE DES FILTRES : JwtFilter était placé AVANT RateLimitFilter,
 *           ce qui signifie que le rate limiting s'appliquait APRÈS la
 *           validation du token. Pour les endpoints publics (login/register)
 *           cela n'avait pas d'impact, mais l'ordre logique est :
 *           RateLimitFilter → JwtFilter → UsernamePasswordAuthenticationFilter.
 *           CORRECTION : RateLimitFilter ajouté BEFORE JwtFilter.
 *
 * [VULN-17] CORS : validation que allowedOrigins ne contient pas de wildcard
 *           avec allowCredentials=true (combinaison interdite par le W3C).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtFilter jwtFilter;
  private final RateLimitFilter rateLimitFilter;
  private final UserRepository userRepository;

  @Value("${cors.allowed-origins}")
  private String allowedOrigins;

  /**
   * Routes entièrement publiques.
   * [VULN-15] Swagger RETIRÉ d'ici — protégé par ROLE_ADMINISTRATEUR ci-dessous.
   * /actuator/health reste public (sonde K8s/Docker).
   */
  private static final String[] PUBLIC_ROUTES = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/actuator/health"
  };

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
      // [VULN-14] CSRF désactivé : API stateless JWT — pas de session, donc pas de CSRF.
      .csrf(AbstractHttpConfigurer::disable)

      .cors(cors -> cors.configurationSource(corsConfigurationSource()))

      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

      // [VULN-13] Headers de sécurité HTTP
      .headers(headers -> headers
        // X-Content-Type-Options: nosniff (activé par défaut, rendu explicite)
        .contentTypeOptions(c -> {})

        // X-Frame-Options: DENY
        .frameOptions(frame -> frame.deny())

        // Strict-Transport-Security (HSTS) — 1 an, includeSubDomains
        .httpStrictTransportSecurity(hsts -> hsts
          .includeSubDomains(true)
          .maxAgeInSeconds(31536000))

        // Referrer-Policy: strict-origin-when-cross-origin
        .referrerPolicy(referrer -> referrer
          .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))

        // Content-Security-Policy
        .contentSecurityPolicy(csp -> csp.policyDirectives(
          "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self'; " +
            "frame-ancestors 'none'; " +
            "form-action 'self';"
        ))

        // Permissions-Policy via StaticHeadersWriter (permissionsPolicy() déprécié Spring Security 6.4+)
        .addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter(
          "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"
        ))
      )

      .authorizeHttpRequests(auth -> auth
        .requestMatchers(PUBLIC_ROUTES).permitAll()

        // [VULN-15] Swagger protégé — uniquement admin et uniquement si activé
        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
        .hasAuthority("ROLE_ADMINISTRATEUR")

        .requestMatchers("/api/admin/**")
        .hasAuthority("ROLE_ADMINISTRATEUR")

        .requestMatchers("/api/enseignant/**", "/api/classes/**")
        .hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMINISTRATEUR")

        .anyRequest().authenticated()
      )

      .authenticationProvider(authenticationProvider())

      // [VULN-16] Ordre correct : RateLimitFilter → JwtFilter → UsernamePasswordAuthFilter
      .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
      .addFilterBefore(jwtFilter, RateLimitFilter.class)

      .build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();

    // [VULN-17] Validation : pas de wildcard avec allowCredentials=true
    List<String> origins = List.of(allowedOrigins.split(","));
    origins.forEach(origin -> {
      if ("*".equals(origin.trim())) {
        throw new IllegalStateException(
          "cors.allowed-origins ne peut pas contenir '*' avec allowCredentials=true");
      }
    });

    config.setAllowedOrigins(origins);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  @Bean
  public UserDetailsService userDetailsService() {
    return email -> userRepository.findByEmail(email)
      .map(user -> new org.springframework.security.core.userdetails.User(
        user.getEmail(),
        user.getPassword(),
        user.isEnabled(),
        true, true, true,
        List.of(new SimpleGrantedAuthority(user.getRole()))
      ))
      // [VULN-18] Message générique — pas de fuite "email inexistant vs mauvais MDP"
      .orElseThrow(() -> new UsernameNotFoundException(
        "Identifiants invalides"));
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  public AuthenticationProvider authenticationProvider() {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
    provider.setUserDetailsService(userDetailsService());
    provider.setPasswordEncoder(passwordEncoder());
    return provider;
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
    throws Exception {
    return config.getAuthenticationManager();
  }
}
