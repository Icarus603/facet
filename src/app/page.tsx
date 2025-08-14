import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FacetLogo } from '@/components/ui/facet-logo';
import { 
  ChatBubbleLeftRightIcon, 
  ArrowRightIcon, 
  SparklesIcon,
  HeartIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  UsersIcon,
  StarIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  return (
    <div className="h-screen bg-facet-chat flex items-center">
      {/* Hero Section - Comfortable Layout */}
      <main className="facet-container w-full">
        <div className="text-center">
          {/* FACET Diamond Logo - Much Bigger */}
          <div className="mb-2">
            <FacetLogo size={120} className="mx-auto" />
          </div>
          
          <h1 className="facet-title text-5xl font-normal mb-5">
            Welcome to FACET
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Multi-agent AI therapy platform integrating cultural wisdom, 
            philosophy, and literature for personalized mental health support.
          </p>
          
          {/* Call to action */}
          <div className="mb-10 flex flex-col sm:flex-row gap-4 justify-center sm:items-center">
            <Link href="/auth/signin">
              <Button className="facet-button-primary text-base px-8 py-3 h-12 rounded-xl shadow-lg flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                Start Therapy Session
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="outline" className="text-base px-8 py-3 h-12 rounded-xl border-facet-wine text-facet-wine hover:bg-facet-wine hover:text-white flex items-center justify-center">
                Login
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          {/* Featured Message - More Breathing Room */}
          <div className="facet-gradient p-8 rounded-xl text-white shadow-lg mb-10">
            <div className="flex items-center justify-center mb-3">
              <SparklesIcon className="w-6 h-6 mr-3" />
              <h2 className="text-xl font-semibold">
                Face Your Challenges Through Cultural Facets
              </h2>
            </div>
            <p className="text-base opacity-95 leading-relaxed">
              Experience healing through humanity's greatest wisdom traditions.
            </p>
          </div>

          {/* Feature Grid - More Spacious */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <Link href="/auth/signin" className="group">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-facet-blue transition-all cursor-pointer">
                <div className="flex items-center justify-center w-12 h-12 bg-facet-blue/10 rounded-xl mx-auto mb-3 group-hover:bg-facet-blue/20">
                  <UsersIcon className="w-6 h-6 text-facet-blue" />
                </div>
                <h3 className="text-sm font-semibold mb-2 text-gray-900 group-hover:text-facet-blue">Multi-Agent AI</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Specialized therapy agents for comprehensive support
                </p>
              </div>
            </Link>
            
            <Link href="/auth/signin" className="group">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-facet-wine transition-all cursor-pointer">
                <div className="flex items-center justify-center w-12 h-12 bg-facet-wine/10 rounded-xl mx-auto mb-3 group-hover:bg-facet-wine/20">
                  <BookOpenIcon className="w-6 h-6 text-facet-wine" />
                </div>
                <h3 className="text-sm font-semibold mb-2 text-gray-900 group-hover:text-facet-wine">Cultural Integration</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Literature and arts woven into conversations
                </p>
              </div>
            </Link>
            
            <Link href="/auth/signin" className="group">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-facet-teal transition-all cursor-pointer">
                <div className="flex items-center justify-center w-12 h-12 bg-facet-teal/10 rounded-xl mx-auto mb-3 group-hover:bg-facet-teal/20">
                  <ShieldCheckIcon className="w-6 h-6 text-facet-teal" />
                </div>
                <h3 className="text-sm font-semibold mb-2 text-gray-900 group-hover:text-facet-teal">Crisis Safety</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Real-time monitoring with intervention protocols
                </p>
              </div>
            </Link>
          </div>

          {/* Trust Indicators - More Space */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <HeartIcon className="w-4 h-4 text-facet-wine" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <StarIcon className="w-4 h-4 text-facet-blue" />
                <span>Expert Validated</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-facet-teal" />
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}