const courseMappings =
    require("../config/courseMappings");

const courseConfigs =
    require("../config/courseConfig");


/* =========================================================
   NORMALIZE COURSE CODE
   ========================================================= */

function normalizeCourseCode(courseCode) {

    if (
        !courseCode ||
        typeof courseCode !== "string"
    ) {
        return "";
    }

    return courseCode
        .replace(/\s+/g, "")
        .replace(/[-_]/g, "")
        .toUpperCase()
        .trim();
}


/* =========================================================
   GET CONFIG BY CANVAS COURSE ID
   ========================================================= */

function getConfigByCourseId(courseId) {

    const numericCourseId =
        Number(courseId);

    if (
        !Number.isFinite(numericCourseId)
    ) {
        return null;
    }

    const configKey =
        courseMappings[numericCourseId];

    if (!configKey) {
        return null;
    }

    const config =
        courseConfigs[configKey];

    if (!config) {

        console.log(
            `⚠️ Course mapping exists but config is missing: ${configKey}`
        );

        return null;
    }

    return {
        ...config,
        configKey,
        courseId: numericCourseId
    };
}


/* =========================================================
   GET CONFIG BY COURSE CODE
   ========================================================= */

function getConfigByCourseCode(courseCode) {

    const normalizedCode =
        normalizeCourseCode(courseCode);

    if (!normalizedCode) {
        return null;
    }


    /* -------------------------------------------------------
       Direct shortName match
       ------------------------------------------------------- */

    for (
        const [configKey, config]
        of Object.entries(courseConfigs)
    ) {

        const shortName =
            normalizeCourseCode(
                config.shortName || ""
            );

        if (
            shortName &&
            shortName === normalizedCode
        ) {

            return {
                ...config,
                configKey
            };
        }
    }


    return null;
}


/* =========================================================
   MAIN COURSE DETECTION
   ========================================================= */

function detectCourse(
    courseCode,
    courseId
) {

    /*
     * COURSE ID IS AUTHORITATIVE
     *
     * This handles:
     *
     * Master Blueprint
     * Term 3
     * Term 4
     *
     * because courseMappings maps all of them
     * to the same config.
     */

    if (
        courseId !== undefined &&
        courseId !== null &&
        courseId !== ""
    ) {

        const config =
            getConfigByCourseId(
                courseId
            );

        if (config) {
            return config;
        }
    }


    /*
     * FALLBACK TO COURSE CODE
     */

    if (courseCode) {

        const config =
            getConfigByCourseCode(
                courseCode
            );

        if (config) {
            return config;
        }
    }


    /*
     * FAIL CLOSED
     */

    return null;
}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports =
    detectCourse;