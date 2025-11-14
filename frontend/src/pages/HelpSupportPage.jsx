// =====================================================
// 24. src/pages/HelpSupportPage.jsx
// =====================================================

import {
  Book,
  Mail,
  Phone,
  FileText,
  Video,
  MessageCircle,
} from "lucide-react";

export default function HelpSupportPage() {
  const resources = [
    {
      icon: Book,
      title: "User Guide",
      description: "Complete documentation on using the platform",
      link: "#",
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Step-by-step video guides for all features",
      link: "#",
    },
    {
      icon: FileText,
      title: "API Documentation",
      description: "Technical documentation for developers",
      link: "#",
    },
  ];

  const faqs = [
    {
      question: "How do I add new equipment to the system?",
      answer:
        'Navigate to the Equipment section, click "Add Equipment", and fill in the required details including equipment ID, name, department, and lab information.',
    },
    {
      question: "How are alerts generated?",
      answer:
        "Alerts are automatically generated based on sensor data thresholds. The system monitors temperature, vibration, energy consumption, and other parameters to detect anomalies.",
    },
    {
      question: "Can I export reports to PDF?",
      answer:
        'Yes, when generating reports (daily, weekly, or monthly), you can check the "Generate PDF" option to create downloadable PDF reports.',
    },
    {
      question: "What roles are available in the system?",
      answer:
        "There are three roles: Trainers (lab-level access), Lab Technicians (institute-level access), and Policy Makers (full system access).",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
        <p className="text-gray-600 mt-1">
          Get help and learn how to use the platform
        </p>
      </div>

      {/* Contact Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">Contact Support</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-blue-900 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-medium mb-1">Email</h3>
              <p className="text-sm text-gray-600">
                saarthitactrion@gmail.com
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Phone className="w-5 h-5 text-blue-900 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-medium mb-1">Phone</h3>
              <p className="text-sm text-gray-600">+91 7357756699</p>
            </div>
          </div>
          {/* <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <MessageCircle className="w-5 h-5 text-blue-900 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-medium mb-1">Live Chat</h3>
              <p className="text-sm text-gray-600">Available 9 AM - 6 PM</p>
            </div>
          </div> */}
        </div>
      </div>

      {/* Resources */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map((resource, index) => (
            <a
              key={index}
              href={resource.link}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              <resource.icon className="w-8 h-8 text-blue-900 mb-3" />
              <h3 className="font-medium mb-1">{resource.title}</h3>
              <p className="text-sm text-gray-600">{resource.description}</p>
            </a>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-b border-gray-200 pb-4 last:border-0 last:pb-0"
            >
              <h3 className="font-medium text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
