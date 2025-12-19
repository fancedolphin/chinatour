import { Phone, MapPin, Globe, FileText, AlertTriangle, Hospital, Shield, MessageSquare, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';

interface EmergencyContact {
  country: string;
  police: string;
  ambulance: string;
  fire: string;
  embassy?: string;
}

interface EmergencyPhrase {
  english: string;
  local: string;
  pronunciation?: string;
}

export function EmergencyAssistantCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('general');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Emergency contacts by country
  const emergencyContacts: Record<string, EmergencyContact> = {
    general: {
      country: 'International',
      police: '112 (Europe) / 911 (US)',
      ambulance: '112 (Europe) / 911 (US)',
      fire: '112 (Europe) / 911 (US)',
    },
    uk: {
      country: 'United Kingdom',
      police: '999 / 112',
      ambulance: '999 / 112',
      fire: '999 / 112',
      embassy: '+44 20 7299 4049 (China)',
    },
    france: {
      country: 'France',
      police: '17',
      ambulance: '15',
      fire: '18',
      embassy: '+33 1 49 52 19 50 (China)',
    },
    japan: {
      country: 'Japan',
      police: '110',
      ambulance: '119',
      fire: '119',
      embassy: '+81 3 3403 3388 (China)',
    },
    usa: {
      country: 'United States',
      police: '911',
      ambulance: '911',
      fire: '911',
      embassy: '+1 202 495 2266 (China)',
    },
    thailand: {
      country: 'Thailand',
      police: '191',
      ambulance: '1669',
      fire: '199',
      embassy: '+66 2 245 7010 (China)',
    },
  };

  // Common emergency phrases
  const emergencyPhrases: Record<string, EmergencyPhrase[]> = {
    general: [
      { english: 'Help!', local: 'Help!' },
      { english: 'I need a doctor', local: 'I need a doctor' },
      { english: 'Where is the hospital?', local: 'Where is the hospital?' },
      { english: 'I am lost', local: 'I am lost' },
      { english: 'Call the police', local: 'Call the police' },
      { english: 'I need an ambulance', local: 'I need an ambulance' },
    ],
    france: [
      { english: 'Help!', local: 'Au secours!', pronunciation: 'oh-se-KOOR' },
      { english: 'I need a doctor', local: "J'ai besoin d'un médecin", pronunciation: 'zhay beh-ZWAN dun mehd-SAN' },
      { english: 'Where is the hospital?', local: "Où est l'hôpital?", pronunciation: 'oo ay loh-pee-TAL' },
      { english: 'I am lost', local: 'Je suis perdu(e)', pronunciation: 'zhuh swee pair-DEW' },
      { english: 'Call the police', local: 'Appelez la police', pronunciation: 'ah-puh-LAY la po-LEES' },
      { english: 'I need an ambulance', local: "J'ai besoin d'une ambulance", pronunciation: 'zhay beh-ZWAN doon ahm-bew-LAHNS' },
    ],
    japan: [
      { english: 'Help!', local: '助けて！(Tasukete!)', pronunciation: 'ta-su-ke-te' },
      { english: 'I need a doctor', local: '医者が必要です (Isha ga hitsuyō desu)', pronunciation: 'ee-sha ga hi-tsu-yo de-su' },
      { english: 'Where is the hospital?', local: '病院はどこですか？(Byōin wa doko desu ka?)', pronunciation: 'byo-in wa do-ko de-su ka' },
      { english: 'I am lost', local: '道に迷いました (Michi ni mayoimashita)', pronunciation: 'mi-chi ni ma-yo-i-ma-shi-ta' },
      { english: 'Call the police', local: '警察を呼んでください (Keisatsu o yonde kudasai)', pronunciation: 'ke-sa-tsu o yon-de ku-da-sai' },
      { english: 'I need an ambulance', local: '救急車が必要です (Kyūkyūsha ga hitsuyō desu)', pronunciation: 'kyu-kyu-sha ga hi-tsu-yo de-su' },
    ],
  };

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <>
      <Card
        className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 border-2 border-red-200 cursor-pointer hover:shadow-lg transition-all"
        onClick={() => setIsOpen(true)}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-gray-900">🆘 Emergency Assistant</h3>
                <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Quick access to emergency services & essential phrases
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/80 rounded-lg px-2 py-1.5 text-center">
                  <Phone className="w-3 h-3 text-red-500 mx-auto mb-1" />
                  <span className="text-gray-700">SOS Call</span>
                </div>
                <div className="bg-white/80 rounded-lg px-2 py-1.5 text-center">
                  <MapPin className="w-3 h-3 text-blue-500 mx-auto mb-1" />
                  <span className="text-gray-700">Embassy</span>
                </div>
                <div className="bg-white/80 rounded-lg px-2 py-1.5 text-center">
                  <Globe className="w-3 h-3 text-green-500 mx-auto mb-1" />
                  <span className="text-gray-700">Phrases</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Emergency Assistant
            </DialogTitle>
            <DialogDescription>
              Quick access to emergency services, phrases, and medical information
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="emergency" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="emergency" className="gap-1 text-xs">
                <Phone className="w-3 h-3" />
                Emergency
              </TabsTrigger>
              <TabsTrigger value="phrases" className="gap-1 text-xs">
                <MessageSquare className="w-3 h-3" />
                Phrases
              </TabsTrigger>
              <TabsTrigger value="medical" className="gap-1 text-xs">
                <Hospital className="w-3 h-3" />
                Medical
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-1 text-xs">
                <FileText className="w-3 h-3" />
                Info
              </TabsTrigger>
            </TabsList>

            {/* Emergency Numbers Tab */}
            <TabsContent value="emergency" className="space-y-4">
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-red-900">Emergency Services</h3>
                </div>
                <p className="text-xs text-red-700 mb-3">
                  Tap any number to call immediately
                </p>

                {/* Country Selector */}
                <div className="mb-4">
                  <label className="text-xs text-gray-600 mb-2 block">Select Country:</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  >
                    <option value="general">International (General)</option>
                    <option value="uk">🇬🇧 United Kingdom</option>
                    <option value="france">🇫🇷 France</option>
                    <option value="japan">🇯🇵 Japan</option>
                    <option value="usa">🇺🇸 United States</option>
                    <option value="thailand">🇹🇭 Thailand</option>
                  </select>
                </div>

                {/* Emergency Numbers */}
                <div className="grid gap-3">
                  <button
                    onClick={() => handleCall(emergencyContacts[selectedCountry].police)}
                    className="flex items-center justify-between bg-white rounded-xl p-4 hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-gray-900">Police</p>
                        <p className="text-xs text-gray-500">Emergency law enforcement</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">{emergencyContacts[selectedCountry].police}</span>
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleCall(emergencyContacts[selectedCountry].ambulance)}
                    className="flex items-center justify-between bg-white rounded-xl p-4 hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                        <Hospital className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-gray-900">Ambulance</p>
                        <p className="text-xs text-gray-500">Medical emergency</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600">{emergencyContacts[selectedCountry].ambulance}</span>
                      <Phone className="w-4 h-4 text-red-600" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleCall(emergencyContacts[selectedCountry].fire)}
                    className="flex items-center justify-between bg-white rounded-xl p-4 hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-gray-900">Fire Department</p>
                        <p className="text-xs text-gray-500">Fire & rescue services</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600">{emergencyContacts[selectedCountry].fire}</span>
                      <Phone className="w-4 h-4 text-orange-600" />
                    </div>
                  </button>

                  {emergencyContacts[selectedCountry].embassy && (
                    <button
                      onClick={() => handleCall(emergencyContacts[selectedCountry].embassy!)}
                      className="flex items-center justify-between bg-white rounded-xl p-4 hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-gray-900">Chinese Embassy</p>
                          <p className="text-xs text-gray-500">Consular assistance</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-xs">{emergencyContacts[selectedCountry].embassy}</span>
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Emergency Phrases Tab */}
            <TabsContent value="phrases" className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-gray-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Essential Emergency Phrases
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Common phrases for emergency situations
                </p>

                {/* Country Selector */}
                <div className="mb-4">
                  <label className="text-xs text-gray-600 mb-2 block">Language:</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  >
                    <option value="general">English</option>
                    <option value="france">🇫🇷 French</option>
                    <option value="japan">🇯🇵 Japanese</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {(emergencyPhrases[selectedCountry] || emergencyPhrases.general).map((phrase, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 mb-1">{phrase.english}</p>
                          <p className="text-gray-700 mb-1">{phrase.local}</p>
                          {phrase.pronunciation && (
                            <p className="text-xs text-gray-500 italic">({phrase.pronunciation})</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(phrase.local, phrase.english)}
                        >
                          {copiedText === phrase.english ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Medical Info Tab */}
            <TabsContent value="medical" className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h3 className="text-gray-900 mb-2 flex items-center gap-2">
                  <Hospital className="w-5 h-5 text-green-600" />
                  Medical Information Storage
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Store important medical information for emergencies
                </p>

                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <label className="text-xs text-gray-600 block mb-2">Blood Type</label>
                    <input
                      type="text"
                      placeholder="e.g., A+, O-, AB+"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    />
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <label className="text-xs text-gray-600 block mb-2">Allergies</label>
                    <textarea
                      placeholder="List any allergies (medications, food, etc.)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                      rows={3}
                    />
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <label className="text-xs text-gray-600 block mb-2">Current Medications</label>
                    <textarea
                      placeholder="List current medications"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                      rows={3}
                    />
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <label className="text-xs text-gray-600 block mb-2">Insurance Information</label>
                    <input
                      type="text"
                      placeholder="Insurance provider & policy number"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm mb-2"
                    />
                    <input
                      type="text"
                      placeholder="Emergency contact number"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    />
                  </div>

                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Save Medical Information
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Additional Info Tab */}
            <TabsContent value="info" className="space-y-4">
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <h3 className="text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Important Resources
                  </h3>
                  <div className="space-y-2 text-sm">
                    <a
                      href="https://www.fmprc.gov.cn/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-gray-900">Ministry of Foreign Affairs</span>
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </a>
                    <a
                      href="https://www.12308.gov.cn/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-gray-900">China Consular Service (12308)</span>
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </a>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <h3 className="text-gray-900 mb-2">⚠️ Safety Tips</h3>
                  <ul className="text-xs text-gray-700 space-y-2">
                    <li>• Always keep a copy of your passport and visa</li>
                    <li>• Share your itinerary with family or friends</li>
                    <li>• Register with your embassy when traveling abroad</li>
                    <li>• Keep emergency numbers saved offline</li>
                    <li>• Know the address of your hotel in local language</li>
                    <li>• Download offline maps of your destination</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="text-gray-900 mb-2">📍 Location Sharing</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Share your real-time location with trusted contacts
                  </p>
                  <Button variant="outline" className="w-full gap-2">
                    <MapPin className="w-4 h-4" />
                    Share My Location
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
