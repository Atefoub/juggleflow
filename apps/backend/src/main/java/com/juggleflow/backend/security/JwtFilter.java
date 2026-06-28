package com.juggleflow.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.juggleflow.backend.service.GdprService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Filtre JWT : valide l'access token (pas les refresh), sans logger le token brut. */
@Slf4j
@Component
public class JwtFilter extends OncePerRequestFilter {

  private final JwtUtils jwtUtils;
  private final UserDetailsService userDetailsService;
  private final GdprService gdprService;

  public JwtFilter(
      JwtUtils jwtUtils,
      @Lazy UserDetailsService userDetailsService,
      @Lazy GdprService gdprService) {
    this.jwtUtils = jwtUtils;
    this.userDetailsService = userDetailsService;
    this.gdprService = gdprService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain)
    throws ServletException, IOException {

    final String authHeader = request.getHeader("Authorization");

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    String jwt = authHeader.substring(7);

    try {
      String email = jwtUtils.extractEmail(jwt);

      if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);

        if (!userDetails.isEnabled()) {
          log.debug("Compte désactivé — requête sur {}", request.getRequestURI());
        } else if (userDetails instanceof JuggleflowUserDetails juggleflowUser
            && !gdprService.isStudentAuthenticationAllowed(juggleflowUser.getUser())) {
          log.debug("Consentement parental invalide — requête sur {}",
            request.getRequestURI());
        } else if (jwtUtils.isTokenValid(jwt, userDetails)) {
          UsernamePasswordAuthenticationToken authToken =
            new UsernamePasswordAuthenticationToken(
              userDetails, null, userDetails.getAuthorities());
          authToken.setDetails(
            new WebAuthenticationDetailsSource().buildDetails(request));
          SecurityContextHolder.getContext().setAuthentication(authToken);
        } else {
          log.debug("Token JWT invalide ou révoqué pour la requête sur {}",
            request.getRequestURI());
        }
      }
    } catch (io.jsonwebtoken.ExpiredJwtException e) {
      log.debug("Token JWT expiré — requête sur {}", request.getRequestURI());
    } catch (io.jsonwebtoken.JwtException e) {
      log.warn("Token JWT malformé sur {} : {}", request.getRequestURI(), e.getMessage());
    } catch (Exception e) {
      log.error("Erreur inattendue dans JwtFilter sur {} : {}",
        request.getRequestURI(), e.getMessage());
    }

    filterChain.doFilter(request, response);
  }
}
