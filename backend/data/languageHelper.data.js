const CATEGORIES = [
  "Basic Conversation",
  "Transport",
  "Emergency",
  "Food & Shopping"
];

const LOCATION_MAPPINGS = [
  {
    city: "Bangalore",
    state: "Karnataka",
    language: "Kannada",
    localities: [
      "Bangalore",
      "Bengaluru",
      "Whitefield",
      "Electronic City",
      "Electronics City",
      "Koramangala",
      "Indiranagar",
      "Marathahalli",
      "Yeshwanthpur",
      "HSR Layout",
      "Jayanagar",
      "Banashankari",
      "Malleshwaram",
      "Hebbal"
    ]
  },
  {
    city: "Chennai",
    state: "Tamil Nadu",
    language: "Tamil",
    localities: [
      "Chennai",
      "Madras",
      "Tambaram",
      "T Nagar",
      "Anna Nagar",
      "Velachery",
      "Adyar",
      "Guindy",
      "Porur",
      "OMR",
      "Sholinganallur",
      "Mylapore"
    ]
  },
  {
    city: "Hyderabad",
    state: "Telangana",
    language: "Telugu",
    localities: [
      "Hyderabad",
      "Secunderabad",
      "Gachibowli",
      "HITEC City",
      "Hitech City",
      "Madhapur",
      "Kukatpally",
      "Banjara Hills",
      "Jubilee Hills",
      "Ameerpet",
      "Begumpet",
      "Kondapur"
    ]
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    language: "Marathi",
    localities: [
      "Mumbai",
      "Bombay",
      "Andheri",
      "Bandra",
      "Dadar",
      "Powai",
      "Thane",
      "Navi Mumbai",
      "Vashi",
      "Borivali",
      "Lower Parel"
    ]
  },
  {
    city: "Delhi",
    state: "Delhi",
    language: "Hindi",
    localities: [
      "Delhi",
      "New Delhi",
      "Dwarka",
      "Saket",
      "Rohini",
      "Karol Bagh",
      "Lajpat Nagar",
      "Connaught Place",
      "Mayur Vihar"
    ]
  }
];

const PHRASES_BY_LANGUAGE = {
  Kannada: [
    {
      category: "Basic Conversation",
      englishPhrase: "Hello",
      localPhrase: "ನಮಸ್ಕಾರ",
      pronunciation: "Namaskara"
    },
    {
      category: "Basic Conversation",
      englishPhrase: "Thank you",
      localPhrase: "ಧನ್ಯವಾದಗಳು",
      pronunciation: "Dhanyavaadagalu"
    },
    {
      category: "Basic Conversation",
      englishPhrase: "I do not know Kannada",
      localPhrase: "ನನಗೆ ಕನ್ನಡ ಗೊತ್ತಿಲ್ಲ",
      pronunciation: "Nanage Kannada gottilla"
    },
    {
      category: "Transport",
      englishPhrase: "Where is the bus stop?",
      localPhrase: "ಬಸ್ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?",
      pronunciation: "Bus nildana ellide?"
    },
    {
      category: "Transport",
      englishPhrase: "Please take me to this address",
      localPhrase: "ದಯವಿಟ್ಟು ಈ ವಿಳಾಸಕ್ಕೆ ತೆಗೆದುಕೊಂಡು ಹೋಗಿ",
      pronunciation: "Dayavittu ee vilasakke tegedukondu hogi"
    },
    {
      category: "Emergency",
      englishPhrase: "Call the police",
      localPhrase: "ಪೊಲೀಸರನ್ನು ಕರೆ ಮಾಡಿ",
      pronunciation: "Police-rannu kare maadi"
    },
    {
      category: "Emergency",
      englishPhrase: "I need a doctor",
      localPhrase: "ನನಗೆ ವೈದ್ಯರು ಬೇಕು",
      pronunciation: "Nanage vaidyaru beku"
    },
    {
      category: "Food & Shopping",
      englishPhrase: "How much does this cost?",
      localPhrase: "ಇದು ಎಷ್ಟು?",
      pronunciation: "Idu eshtu?"
    },
    {
      category: "Food & Shopping",
      englishPhrase: "I want drinking water",
      localPhrase: "ನನಗೆ ಕುಡಿಯುವ ನೀರು ಬೇಕು",
      pronunciation: "Nanage kudiyuva neeru beku"
    }
  ],
  Tamil: [
    {
      category: "Basic Conversation",
      englishPhrase: "Hello",
      localPhrase: "வணக்கம்",
      pronunciation: "Vanakkam"
    },
    {
      category: "Basic Conversation",
      englishPhrase: "Thank you",
      localPhrase: "நன்றி",
      pronunciation: "Nandri"
    },
    {
      category: "Basic Conversation",
      englishPhrase: "I do not know Tamil",
      localPhrase: "எனக்கு தமிழ் தெரியாது",
      pronunciation: "Enakku Tamil theriyathu"
    },
    {
      category: "Transport",
      englishPhrase: "Where is the bus stop?",
      localPhrase: "பேருந்து நிறுத்தம் எங்கே?",
      pronunciation: "Perundhu nirutham enge?"
    },
    {
      category: "Transport",
      englishPhrase: "Please take me to this address",
      localPhrase: "தயவுசெய்து இந்த முகவரிக்கு அழைத்துச் செல்லுங்கள்",
      pronunciation: "Thayavuseithu indha mugavarikku azhaithu sellungal"
    },
    {
      category: "Emergency",
      englishPhrase: "Call the police",
      localPhrase: "காவல்துறையை அழைக்கவும்",
      pronunciation: "Kaaval thuraiyai azhaikkavum"
    },
    {
      category: "Emergency",
      englishPhrase: "I need a doctor",
      localPhrase: "எனக்கு மருத்துவர் வேண்டும்",
      pronunciation: "Enakku maruththuvar vendum"
    },
    {
      category: "Food & Shopping",
      englishPhrase: "How much does this cost?",
      localPhrase: "இது எவ்வளவு?",
      pronunciation: "Idhu evvalavu?"
    },
    {
      category: "Food & Shopping",
      englishPhrase: "I want drinking water",
      localPhrase: "எனக்கு குடிநீர் வேண்டும்",
      pronunciation: "Enakku kudineer vendum"
    }
  ],
  Telugu: [
    {
      category: "Basic Conversation",
      englishPhrase: "Hello",
      localPhrase: "నమస్కారం",
      pronunciation: "Namaskaram"
    },
    {
      category: "Basic Conversation",
      englishPhrase: "Thank you",
      localPhrase: "ధన్యవాదాలు",
      pronunciation: "Dhanyavaadalu"
    },
    {
      category: "Basic Conversation",
      englishPhrase: "I do not know Telugu",
      localPhrase: "నాకు తెలుగు తెలియదు",
      pronunciation: "Naaku Telugu teliyadu"
    },
    {
      category: "Transport",
      englishPhrase: "Where is the bus stop?",
      localPhrase: "బస్ స్టాప్ ఎక్కడ ఉంది?",
      pronunciation: "Bus stop ekkada undi?"
    },
    {
      category: "Transport",
      englishPhrase: "Please take me to this address",
      localPhrase: "దయచేసి ఈ చిరునామాకు తీసుకెళ్లండి",
      pronunciation: "Dayachesi ee chirunamaku teesukellandi"
    },
    {
      category: "Emergency",
      englishPhrase: "Call the police",
      localPhrase: "పోలీసులను పిలవండి",
      pronunciation: "Police-lanu pilavandi"
    },
    {
      category: "Emergency",
      englishPhrase: "I need a doctor",
      localPhrase: "నాకు డాక్టర్ కావాలి",
      pronunciation: "Naaku doctor kaavali"
    },
    {
      category: "Food & Shopping",
      englishPhrase: "How much does this cost?",
      localPhrase: "ఇది ఎంత?",
      pronunciation: "Idi entha?"
    },
    {
      category: "Food & Shopping",
      englishPhrase: "I want drinking water",
      localPhrase: "నాకు తాగునీరు కావాలి",
      pronunciation: "Naaku taguneeru kaavali"
    }
  ],
  Marathi: [
    {
      category: "Basic Conversation",
      englishPhrase: "Hello",
      localPhrase: "नमस्कार",
      pronunciation: "Namaskar"
    },
    {
      category: "Basic Conversation",
      englishPhrase: "Thank you",
      localPhrase: "धन्यवाद",
      pronunciation: "Dhanyavaad"
    },
    {
      category: "Transport",
      englishPhrase: "Where is the bus stop?",
      localPhrase: "बस थांबा कुठे आहे?",
      pronunciation: "Bus thamba kuthe aahe?"
    },
    {
      category: "Emergency",
      englishPhrase: "Call the police",
      localPhrase: "पोलिसांना बोलवा",
      pronunciation: "Polisana bolva"
    },
    {
      category: "Food & Shopping",
      englishPhrase: "How much does this cost?",
      localPhrase: "हे कितीला आहे?",
      pronunciation: "He kitila aahe?"
    }
  ],
  Hindi: [
    {
      category: "Basic Conversation",
      englishPhrase: "Hello",
      localPhrase: "नमस्ते",
      pronunciation: "Namaste"
    },
    {
      category: "Basic Conversation",
      englishPhrase: "Thank you",
      localPhrase: "धन्यवाद",
      pronunciation: "Dhanyavaad"
    },
    {
      category: "Transport",
      englishPhrase: "Where is the bus stop?",
      localPhrase: "बस स्टॉप कहां है?",
      pronunciation: "Bus stop kahan hai?"
    },
    {
      category: "Emergency",
      englishPhrase: "Call the police",
      localPhrase: "पुलिस को बुलाइए",
      pronunciation: "Police ko bulaiye"
    },
    {
      category: "Food & Shopping",
      englishPhrase: "How much does this cost?",
      localPhrase: "यह कितने का है?",
      pronunciation: "Yeh kitne ka hai?"
    }
  ]
};

module.exports = {
  CATEGORIES,
  LOCATION_MAPPINGS,
  PHRASES_BY_LANGUAGE
};
