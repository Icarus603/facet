import { FacetLogo } from '@/components/ui/facet-logo'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileText, User, Shield, AlertCircle } from 'lucide-react'

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed meslo-font italic">
              Terms and conditions for using the FACET AI mental health platform
            </p>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-600 mr-3" />
              <h2 className="text-2xl font-bold text-yellow-800">Important Notice</h2>
            </div>
            <p className="text-yellow-700 leading-relaxed">
              FACET is an AI-powered mental wellness platform developed as an individual project. 
              It is not a substitute for professional medical care, therapy, or crisis intervention services. 
              If you are experiencing a mental health emergency, please contact emergency services or a crisis hotline immediately.
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            
            {/* Service Description */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic flex items-center">
                <FileText className="h-8 w-8 mr-3 text-blue-600" />
                Service Description
              </h2>
              
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  FACET is an AI-powered mental wellness companion that provides:
                </p>
                <ul className="space-y-2 text-gray-700 list-disc list-inside ml-4">
                  <li>Personalized AI conversations for mental wellness support</li>
                  <li>Mood tracking and pattern analysis</li>
                  <li>Crisis detection with resource guidance</li>
                  <li>CBT/DBT-inspired wellness exercises and suggestions</li>
                  <li>Long-term memory and conversation continuity</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  This is an individual developer project intended for educational and wellness support purposes.
                </p>
              </div>
            </div>

            {/* User Responsibilities */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic flex items-center">
                <User className="h-8 w-8 mr-3 text-green-600" />
                Your Responsibilities
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Appropriate Use</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Use FACET as a wellness companion, not as professional medical treatment</li>
                    <li>Provide accurate information to help the AI provide better support</li>
                    <li>Respect the platform and avoid attempting to abuse or exploit the service</li>
                    <li>Keep your account credentials secure</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Safety Responsibilities</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>Seek professional help for serious mental health concerns</li>
                    <li>Contact emergency services if experiencing a mental health crisis</li>
                    <li>Understand that AI responses are automated and not professional medical advice</li>
                    <li>Use your judgment when considering AI suggestions and recommendations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Platform Limitations */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic flex items-center">
                <Shield className="h-8 w-8 mr-3 text-orange-600" />
                Platform Limitations & Disclaimers
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Service Limitations</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>FACET is developed and maintained by one individual developer</li>
                    <li>Service availability and response times are provided on a best-effort basis</li>
                    <li>The platform may experience downtime or technical issues</li>
                    <li>AI responses are automated and may not always be perfect or appropriate</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Medical Disclaimers</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>FACET does not provide medical advice, diagnosis, or treatment</li>
                    <li>The platform is not a substitute for professional mental health services</li>
                    <li>Crisis detection features are automated and may not catch all situations</li>
                    <li>Always consult qualified professionals for serious mental health concerns</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data & Privacy */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">
                Data & Privacy
              </h2>
              
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Your use of FACET is also governed by our Privacy Policy, which details how we collect, 
                  use, and protect your personal information.
                </p>
                <ul className="space-y-2 text-gray-700 list-disc list-inside">
                  <li>You retain ownership of your personal data and conversations</li>
                  <li>Data is encrypted and stored securely</li>
                  <li>You can request data deletion at any time</li>
                  <li>We do not sell or share your data with third parties</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Please review our <Link href="/privacy-policy" className="text-blue-600 underline">Privacy Policy</Link> for complete details.
                </p>
              </div>
            </div>

            {/* Service Changes */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">
                Service Changes & Termination
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Service Updates</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    As an individual development project, FACET may undergo changes, updates, or improvements. 
                    We will make reasonable efforts to notify users of significant changes.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-black mb-3">Account Termination</h3>
                  <ul className="space-y-2 text-gray-700 list-disc list-inside">
                    <li>You may delete your account at any time</li>
                    <li>We may suspend accounts that violate these terms</li>
                    <li>The service may be discontinued with reasonable notice to users</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-blue-50 rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">
                Questions & Support
              </h2>
              
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                If you have questions about these Terms of Service, please contact:
              </p>
              
              <div className="text-center">
                <div>
                  <h3 className="text-lg font-bold text-black mb-2">Developer Contact</h3>
                  <p className="text-gray-700">Email: zhehongl91@gmail.com</p>
                  <p className="text-gray-700">GitHub: @Icarus603</p>
                  <p className="text-sm text-gray-600 mt-2">Response time: Best effort within a few days</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-blue-200">
                <p className="text-sm text-gray-600">
                  These terms may be updated occasionally. Continued use of FACET after changes 
                  indicates acceptance of the updated terms. We will make reasonable efforts to 
                  notify users of material changes.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}