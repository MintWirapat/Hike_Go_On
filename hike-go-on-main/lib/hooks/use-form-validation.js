"use client"

import { useState, useCallback } from "react"

export function useFormValidation(initialValues = {}, validationRules = {}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ฟังก์ชันตรวจสอบความถูกต้องของฟอร์ม
  const validate = useCallback(() => {
    const newErrors = {}
    let isValid = true

    Object.keys(validationRules).forEach((field) => {
      const value = values[field]
      const rules = validationRules[field]

      // ตรวจสอบแต่ละกฎ
      if (rules.required && (!value || value.trim() === "")) {
        newErrors[field] = rules.required === true ? "กรุณากรอกข้อมูลในช่องนี้" : rules.required
        isValid = false
      } else if (rules.minLength && value.length < rules.minLength) {
        newErrors[field] = `ต้องมีอย่างน้อย ${rules.minLength} ตัวอักษร`
        isValid = false
      } else if (rules.pattern && !rules.pattern.test(value)) {
        newErrors[field] = rules.message || "รูปแบบไม่ถูกต้อง"
        isValid = false
      } else if (rules.custom && typeof rules.custom === "function") {
        const customError = rules.custom(value, values)
        if (customError) {
          newErrors[field] = customError
          isValid = false
        }
      }
    })

    setErrors(newErrors)
    return isValid
  }, [values, validationRules])

  // จัดการการเปลี่ยนแปลงค่าในฟอร์ม
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target
      setValues((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }))

      // ตรวจสอบความถูกต้องเมื่อมีการเปลี่ยนแปลง
      if (touched[name]) {
        validate()
      }
    },
    [touched, validate],
  )

  // จัดการการ blur ออกจากฟิลด์
  const handleBlur = useCallback(
    (e) => {
      const { name } = e.target
      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }))
      validate()
    },
    [validate],
  )

  // รีเซ็ตฟอร์ม
  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  // ส่งฟอร์ม
  const handleSubmit = useCallback(
    async (onSubmit) => {
      setTouched(
        Object.keys(validationRules).reduce((acc, field) => {
          acc[field] = true
          return acc
        }, {}),
      )

      const isValid = validate()

      if (isValid) {
        setIsSubmitting(true)
        try {
          await onSubmit(values)
        } catch (error) {
          console.error("Form submission error:", error)
          setErrors((prev) => ({
            ...prev,
            form: error.message || "เกิดข้อผิดพลาดในการส่งฟอร์ม",
          }))
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [validate, values, validationRules],
  )

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
  }
}
