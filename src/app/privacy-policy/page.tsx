import { FacetLogo } from '@/components/ui/facet-logo'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Shield, Lock, Eye, Users, FileText, Clock } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen" style={{backgroundColor: '#FAF9F5'}}>
      {/* Header */}
      <header className="relative sticky top-0 z-50" style={{backgroundColor: '#FAF9F5'}}>
        <div className="w-full pl-2 pr-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center h-24">
              <FacetLogo className="h-24 w-24" />
              <span className="text-2xl text-facet-gradient facet-title-zapfino leading-relaxed m-0 pl-2 pr-12 pt-6 pb-2 -ml-2">FACET</span>
            </div>
            <div className="flex items-center gap-3 mr-4">
              <Link href="/auth/signin">
                <Button variant="default" size="lg">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="wine" size="lg">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-black mb-6 meslo-font italic">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed meslo-font italic">
              Your privacy and the security of your mental health data are our highest priorities.
            </p>
          </div>

          {/* Privacy First Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center mb-4">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-blue-800">Privacy-First Platform</h2>
            </div>
            <p className="text-blue-700 leading-relaxed">
              FACET is designed with privacy as a core principle. Your mental health conversations are 
              encrypted and stored securely, with no data sharing without your explicit consent.
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            
            {/* Information We Collect */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic flex items-center">
                <FileText className="h-8 w-8 mr-3 text-blue-600" />
                Information We Collect
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Personal Information</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Name, email address, and contact information</li>
                    <li>Date of birth and demographic information (optional)</li>
                    <li>Account credentials and authentication data</li>
                    <li>Emergency contact information (if provided)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Health Information</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Mental health assessments and screening results</li>
                    <li>Therapy session conversations and interactions</li>
                    <li>Mood tracking data and self-reported symptoms</li>
                    <li>Treatment goals and progress notes</li>
                    <li>Crisis assessments and intervention records</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Technical Information</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Device information and browser type</li>
                    <li>IP address and location data (anonymized)</li>
                    <li>Usage patterns and feature interactions</li>
                    <li>Performance metrics and error logs</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How We Use Information */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic flex items-center">
                <Users className="h-8 w-8 mr-3 text-green-600" />
                How We Use Your Information
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-bold text-black mb-3">AI Conversation Services</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Provide personalized AI mental health conversations</li>
                    <li>Track mood patterns and personal insights</li>
                    <li>Detect concerning language patterns for resource guidance</li>
                    <li>Generate personalized wellness suggestions</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Platform Operations</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Maintain and improve service quality</li>
                    <li>Ensure platform security and prevent abuse</li>
                    <li>Provide basic technical support</li>
                    <li>Comply with applicable legal requirements</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Protection */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic flex items-center">
                <Lock className="h-8 w-8 mr-3 text-purple-600" />
                Data Protection & Security
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Encryption</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>AES-256 encryption for data at rest</li>
                    <li>TLS 1.3 encryption for data in transit</li>
                    <li>End-to-end encryption for conversations</li>
                    <li>Encrypted database storage</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Access Controls</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Secure user authentication</li>
                    <li>Individual user access controls</li>
                    <li>Regular security updates</li>
                    <li>Automated security monitoring</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Information Sharing */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic flex items-center">
                <Eye className="h-8 w-8 mr-3 text-orange-600" />
                Information Sharing & Disclosure
              </h2>
              
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-red-700 mb-2">We Never Sell Your Data</h3>
                  <p className="text-red-700">
                    FACET will never sell, rent, or trade your personal or health information to third parties for commercial purposes.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Limited Sharing Circumstances</h3>
                  <p className="text-gray-700 mb-3">We may share your information only in these specific situations:</p>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li><strong>With Your Consent:</strong> When you explicitly authorize data export or sharing</li>
                    <li><strong>Emergency Situations:</strong> Only when legally required to prevent imminent harm</li>
                    <li><strong>Legal Requirements:</strong> When compelled by valid legal process or court orders</li>
                    <li><strong>Service Providers:</strong> With essential technical service providers (under strict confidentiality agreements)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Your Rights */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">
                Your Privacy Rights
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Data Control</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Access all your personal data</li>
                    <li>Correct inaccurate information</li>
                    <li>Delete your account and data</li>
                    <li>Export your data in portable format</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Privacy Preferences</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Control sharing with emergency contacts</li>
                    <li>Manage data retention periods</li>
                    <li>Opt out of research participation</li>
                    <li>Customize privacy settings</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">
                Data Retention
              </h2>
              
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  We retain your information only as long as necessary to provide services and comply with legal obligations:
                </p>
                <ul className="space-y-2 text-gray-700 list-disc list-inside">
                  <li><strong>Active Accounts:</strong> Data retained while account is active and for therapeutic continuity</li>
                  <li><strong>Inactive Accounts:</strong> Data anonymized or deleted after 3 years of inactivity</li>
                  <li><strong>Account Deletion:</strong> Data permanently deleted within 30 days of deletion request</li>
                  <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
                </ul>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-blue-50 rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">
                Privacy Questions & Concerns
              </h2>
              
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or how we handle your data, please contact us:
              </p>
              
              <div className="text-center">
                <div>
                  <h3 className="text-lg font-bold text-black mb-2">Contact Developer</h3>
                  <p className="text-gray-700">Email: zhehongl91@gmail.com</p>
                  <p className="text-gray-700">GitHub: @Icarus603</p>
                  <p className="text-sm text-gray-600 mt-2">Response time: Best effort within a few days</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-blue-200">
                <p className="text-sm text-gray-600">
                  We will notify you of any material changes to this Privacy Policy by email and through the platform. 
                  Continued use after changes indicates acceptance of the updated policy.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}