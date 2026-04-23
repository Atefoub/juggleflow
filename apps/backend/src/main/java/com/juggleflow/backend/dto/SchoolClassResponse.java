// filename: backend/src/main/java/com/juggleflow/backend/dto/SchoolClassResponse.java
package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.SchoolClass;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SchoolClassResponse {

    private Long id;
    private String name;
    private String schoolLevel;
    private int schoolYear;
    private int studentCount;
    private String homeroomTeacherName;

    /**
     * Construit un SchoolClassResponse à partir de l'entité JPA.
     *
     * @param sc l'entité SchoolClass
     * @return le DTO correspondant
     */
    public static SchoolClassResponse from(SchoolClass sc) {
        String teacherName = null;
        if (sc.getHomeroomTeacher() != null) {
            teacherName = sc.getHomeroomTeacher().getFirstName()
                + " " + sc.getHomeroomTeacher().getLastName();
        }
        return SchoolClassResponse.builder()
                .id(sc.getId())
                .name(sc.getName())
                .schoolLevel(sc.getSchoolLevel())
                .schoolYear(sc.getSchoolYear())
                .studentCount(sc.getStudentCount())
                .homeroomTeacherName(teacherName)
                .build();
    }
}
