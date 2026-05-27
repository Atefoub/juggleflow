package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.User;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class UserProfileResponse {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private Instant createdAt;
    /** BEGINNER | INTERMEDIATE | ADVANCED | EXPERT — élèves uniquement. */
    private String jugglingLevel;
    private boolean onboardingCompleted;

    public static UserProfileResponse from(User user) {
        UserProfileResponseBuilder builder = UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .createdAt(user.getCreatedAt());

        if (user instanceof Student student) {
            builder.jugglingLevel(student.getJugglingLevel());
            builder.onboardingCompleted(student.getOnboardingCompletedAt() != null);
        }

        return builder.build();
    }
}
