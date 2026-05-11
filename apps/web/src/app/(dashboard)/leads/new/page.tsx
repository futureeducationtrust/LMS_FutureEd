"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCreateLead } from "@/hooks/useLeads";
import { useCourses } from "@/hooks/useCourses";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export default function NewLeadPage() {
  const router = useRouter();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const createLead = useCreateLead();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    // Step 1
    phone: "",
    studentName: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    fatherName: "",
    // Step 2
    courseIds: [] as string[],
    sourceId: "",
    otherSource: "",
    // Step 3
    qualification: "",
    schoolCollege: "",
    board: "",
    passingYear: "",
    marksPercentage: "",
    address: "",
    alternatePhone: "",
    whatsappPhone: "",
    email: "",
    nextFollowUpAt: "",
    sendEmail: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (coursesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="Loading courses..." />
      </div>
    );
  }

  function validateStep1(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.phone) newErrors.phone = "Phone is required";
    if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, "")))
      newErrors.phone = "Phone must be 10 digits";
    if (!formData.studentName)
      newErrors.studentName = "Student name is required";
    if (!formData.dobDay || !formData.dobMonth || !formData.dobYear)
      newErrors.dob = "Date of birth is required";
    if (!formData.fatherName) newErrors.fatherName = "Father name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateStep1()) return;

    try {
      const courseIds =
        formData.courseIds.length > 0 ? formData.courseIds : [""];
      const sourceId = formData.sourceId || "";

      const leadData: Record<string, any> = {
        phone: formData.phone,
        studentName: formData.studentName,
        dobDay: parseInt(formData.dobDay),
        dobMonth: parseInt(formData.dobMonth),
        dobYear: parseInt(formData.dobYear),
        fatherName: formData.fatherName,
        courseIds: courseIds,
        sourceId: sourceId,
        sendEmail: formData.sendEmail,
      };

      // Add optional fields only if they have values
      if (formData.otherSource) leadData.otherSource = formData.otherSource;
      if (formData.qualification)
        leadData.qualification = formData.qualification;
      if (formData.schoolCollege)
        leadData.schoolCollege = formData.schoolCollege;
      if (formData.board) leadData.board = formData.board;
      if (formData.passingYear)
        leadData.passingYear = parseInt(formData.passingYear);
      if (formData.marksPercentage)
        leadData.marksPercentage = parseInt(formData.marksPercentage);
      if (formData.address) leadData.address = formData.address;
      if (formData.alternatePhone)
        leadData.alternatePhone = formData.alternatePhone;
      if (formData.whatsappPhone)
        leadData.whatsappPhone = formData.whatsappPhone;
      if (formData.email) leadData.email = formData.email;
      if (formData.nextFollowUpAt)
        leadData.nextFollowUpAt = formData.nextFollowUpAt;

      await createLead.mutateAsync(leadData as any);

      router.push("/leads");
    } catch {
      // Error handling is in the mutation
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Lead</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter student enquiry details
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8 flex gap-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              step >= s ? "bg-primary" : "bg-surface-200",
            )}
          />
        ))}
      </div>

      {/* Form */}
      <div className="bg-white border border-surface-200 rounded-xl p-8">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Basic Information
              </h2>

              <Input
                label="Mobile Number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                error={errors.phone}
                placeholder="9876543210"
                required
              />

              <Input
                label="Student Name"
                value={formData.studentName}
                onChange={(e) =>
                  setFormData({ ...formData, studentName: e.target.value })
                }
                error={errors.studentName}
                placeholder="John Doe"
                required
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Day"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dobDay}
                  onChange={(e) =>
                    setFormData({ ...formData, dobDay: e.target.value })
                  }
                  placeholder="DD"
                  required
                />
                <Input
                  label="Month"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.dobMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, dobMonth: e.target.value })
                  }
                  placeholder="MM"
                  required
                />
                <Input
                  label="Year"
                  type="number"
                  min="1980"
                  max={new Date().getFullYear()}
                  value={formData.dobYear}
                  onChange={(e) =>
                    setFormData({ ...formData, dobYear: e.target.value })
                  }
                  placeholder="YYYY"
                  required
                />
              </div>
              {errors.dob && (
                <p className="text-xs text-red-500">{errors.dob}</p>
              )}

              <Input
                label="Father's Name"
                value={formData.fatherName}
                onChange={(e) =>
                  setFormData({ ...formData, fatherName: e.target.value })
                }
                error={errors.fatherName}
                placeholder="Father's full name"
                required
              />
            </>
          )}

          {/* Step 2: Course & Source */}
          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Course & Source
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interested Courses
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {courses?.map((course) => (
                    <label
                      key={course.id}
                      className="flex items-center gap-2 p-2 hover:bg-surface-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.courseIds.includes(course.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              courseIds: [...formData.courseIds, course.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              courseIds: formData.courseIds.filter(
                                (id) => id !== course.id,
                              ),
                            });
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        {course.name}
                        {course.code && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({course.code})
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Lead Source ID"
                value={formData.sourceId}
                onChange={(e) =>
                  setFormData({ ...formData, sourceId: e.target.value })
                }
                placeholder="Select source"
              />

              <Input
                label="If Other, Specify"
                value={formData.otherSource}
                onChange={(e) =>
                  setFormData({ ...formData, otherSource: e.target.value })
                }
                placeholder="Source details"
              />
            </>
          )}

          {/* Step 3: Additional Info */}
          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Additional Information
              </h2>

              <Input
                label="Qualification"
                value={formData.qualification}
                onChange={(e) =>
                  setFormData({ ...formData, qualification: e.target.value })
                }
                placeholder="12th, Diploma, etc."
              />

              <Input
                label="School/College"
                value={formData.schoolCollege}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    schoolCollege: e.target.value,
                  })
                }
                placeholder="Institution name"
              />

              <Input
                label="Board"
                value={formData.board}
                onChange={(e) =>
                  setFormData({ ...formData, board: e.target.value })
                }
                placeholder="CBSE, ICSE, State, etc."
              />

              <Input
                label="Passing Year"
                type="number"
                value={formData.passingYear}
                onChange={(e) =>
                  setFormData({ ...formData, passingYear: e.target.value })
                }
                placeholder="2024"
              />

              <Input
                label="Marks %"
                type="number"
                value={formData.marksPercentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    marksPercentage: e.target.value,
                  })
                }
                placeholder="85"
              />

              <Input
                label="Address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Full address"
              />

              <Input
                label="Alternate Phone"
                value={formData.alternatePhone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    alternatePhone: e.target.value,
                  })
                }
                placeholder="9876543210"
              />

              <Input
                label="WhatsApp Number"
                value={formData.whatsappPhone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    whatsappPhone: e.target.value,
                  })
                }
                placeholder="9876543210"
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="student@email.com"
              />

              <Input
                label="Next Follow-up Date"
                type="datetime-local"
                value={formData.nextFollowUpAt}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nextFollowUpAt: e.target.value,
                  })
                }
              />

              <label className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sendEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sendEmail: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">
                  Send welcome email
                </span>
              </label>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-surface-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
            >
              Cancel
            </button>

            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Back
              </button>
            )}

            {step < 3 && (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && validateStep1()) {
                    setStep(2);
                  } else if (step === 2) {
                    setStep(3);
                  }
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-800 font-medium text-sm"
              >
                Next
              </button>
            )}

            {step === 3 && (
              <button
                type="submit"
                disabled={createLead.isPending}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-800 font-medium text-sm disabled:opacity-50"
              >
                {createLead.isPending ? "Creating..." : "Create Lead"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
