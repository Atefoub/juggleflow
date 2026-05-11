package com.juggleflow.backend.security;

import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
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
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
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
 *           CORRECTION : Swagger conditionnel via swagger.public (dev) ou
 *           protégé par ROLE_ADMINISTRATEUR (prod).
 *
 * [VULN-16] ORDRE DES FILTRES : JwtFilter était placé AVANT RateLimitFilter,
 *           ce qui signifie que le rate limiting s'appliquait APRÈS la
 *           validation du token. Pour les endpoints publics (login/register)
 *           cela n'avait pas d'impact, mais l'ordre logique est :
 *           RateLimitFilter → JwtFilter → UsernamePasswordAuthenticationFilter.
 *           CORRECTION 04/05/2026 : les deux appels addFilterBefore étaient
 *           inversés dans l'implémentation précédente — corrigé ci-dessous.
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
   * [VULN-15] swagger.public=true  → Swagger ouvert sans auth (dev local uniquement)
   *           swagger.public=false → Swagger protégé par ROLE_ADMINISTRATEUR (prod)
   *           Valeur par défaut : false (sécurisé par défaut)
   */
  @Value("${swagger.public:false}")
  private boolean swaggerPublic;

  /**
   * Routes entièrement publiques.
   *
   * [VULN-15] Swagger RETIRÉ d'ici — géré conditionnellement ci-dessous.
   * /actuator/health reste public (sonde K8s/Docker).
   *
   * [FIX-LOGOUT] /api/auth/logout ajouté ici (04/05/2026).
   *   Problème : un utilisateur dont l'access token est expiré obtenait un 401
   *   avant d'atteindre l'endpoint, laissant le cookie refresh_token actif.
   *   Solution : le logout ne nécessite pas de token Bearer valide — il lit
   *   directement le cookie httpOnly et révoque le refresh token côté serveur.
   *   Risque CSRF mitigé par SameSite=Strict sur le cookie refresh_token :
   *   une requête cross-site ne pourra jamais envoyer le cookie.
   *
   * [FIX-COOKIE] /api/auth/refresh rendu public : le frontend envoie un body
   *   vide avec credentials: 'include' (cookie httpOnly). Spring Security ne
   *   doit pas rejeter la requête avant que le cookie soit lu par le controller.
   */
  private static final String[] PUBLIC_ROUTES = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/actuator/health"
  };

  private static final String[] SWAGGER_ROUTES = {
    "/v3/api-docs/**",
    "/swagger-ui/**",
    "/swagger-ui.html"
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
        .contentTypeOptions(c -> {})
        .frameOptions(frame -> frame.deny())
        .httpStrictTransportSecurity(hsts -> hsts
          .includeSubDomains(true)
          .maxAgeInSeconds(31536000))
        .referrerPolicy(referrer -> referrer
          .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
        .contentSecurityPolicy(csp -> csp.policyDirectives(
          "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self'; " +
            "frame-ancestors 'none'; " +
            "form-action 'self';"
        ))
        .addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter(
          "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"
        ))
      )

      .authorizeHttpRequests(auth -> auth
        .requestMatchers(PUBLIC_ROUTES).permitAll()

        // [VULN-15] Swagger : public si swagger.public=true (dev), admin sinon (prod)
        .requestMatchers(SWAGGER_ROUTES).access(swaggerAuthorizationManager())

        .requestMatchers("/api/admin/**")
        .hasAuthority("ROLE_ADMINISTRATEUR")

        .requestMatchers("/api/enseignant/**", "/api/classes/**")
        .hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMINISTRATEUR")

        .anyRequest().authenticated()
      )

      .authenticationProvider(authenticationProvider())

      // [VULN-16] Ordre d'exécution : RateLimitFilter → JwtFilter → UsernamePasswordAuthFilter.
      // addFilterBefore(F, R) insère F juste AVANT R dans la chaîne Spring Security.
      // Pour obtenir RateLimit → Jwt → UsernamePassword, on déclare de droite à gauche :
      //   1. JwtFilter        juste avant UsernamePasswordAuthenticationFilter
      //   2. RateLimitFilter  juste avant JwtFilter
      .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
      .addFilterBefore(rateLimitFilter, JwtFilter.class)

      .build();
  }

  /**
   * [VULN-15] AuthorizationManager dédié pour les routes Swagger.
   *
   * Typage explicite (AuthorizationManager<RequestAuthorizationContext>) volontaire :
   *   - rend l'intention testable indépendamment du SecurityFilterChain ;
   *   - évite l'ambiguïté d'inférence de Spring Security 6.4 où l'interface
   *     AuthorizationManager expose désormais check() ET authorize() (l'un des
   *     deux est default), ce qui perturbe javac sur un lambda multi-instructions
   *     passé directement à .access(...) ;
   *   - réutilise AuthorityAuthorizationManager.hasAuthority(...) — l'API
   *     idiomatique Spring Security — au lieu de réimplémenter la vérification
   *     d'autorité à la main.
   */
  private AuthorizationManager<RequestAuthorizationContext> swaggerAuthorizationManager() {
    if (swaggerPublic) {
      return (authentication, context) -> new AuthorizationDecision(true);
    }
    return AuthorityAuthorizationManager.hasAuthority("ROLE_ADMINISTRATEUR");
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
      .orElseThrow(() -> new UsernameNotFoundException("Identifiants invalides"));
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
