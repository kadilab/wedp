const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const templates = [
  {
    name: 'Florale Dorée',
    slug: 'florale-doree',
    description: 'Design floral avec des accents dorés et un cadre élégant. Parfait pour un mariage classique et raffiné.',
    category: 'ELEGANT',
    isPremium: false,
    previewImage: '/uploads/templates/3677480.jpg',
    thumbnail: '/uploads/templates/3677480.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#C4956A',
      secondary: '#F5E6D3',
      accent: '#2D5016',
      background: '#FDF8F0'
    },
    config: {
      colors: {
        primary: '#C4956A',
        secondary: '#F5E6D3',
        background: '#FDF8F0',
        text: '#2C2C2C',
        accent: '#2D5016'
      },
      fonts: {
        heading: 'Playfair Display, serif',
        body: 'Montserrat, sans-serif',
        script: 'Great Vibes, cursive'
      },
      layout: {
        style: 'floral-frame',
        borderRadius: '0px',
        padding: '40px'
      },
      decorations: ['floral-corners', 'gold-border']
    }
  },
  {
    name: 'Aquarelle Romantique',
    slug: 'aquarelle-romantique',
    description: 'Invitation aux tons pastel avec des aquarelles florales délicates. Un style romantique et doux.',
    category: 'ROMANTIC',
    isPremium: false,
    previewImage: '/uploads/templates/5340371.jpg',
    thumbnail: '/uploads/templates/5340371.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#E8B4BC',
      secondary: '#F8E1E4',
      accent: '#4A7C59',
      background: '#FFF9F9'
    },
    config: {
      colors: {
        primary: '#E8B4BC',
        secondary: '#F8E1E4',
        background: '#FFF9F9',
        text: '#4A3F3F',
        accent: '#4A7C59'
      },
      fonts: {
        heading: 'Great Vibes, cursive',
        body: 'Lato, sans-serif',
        script: 'Great Vibes, cursive'
      },
      layout: {
        style: 'watercolor',
        borderRadius: '20px',
        padding: '36px'
      },
      decorations: ['watercolor-flowers', 'soft-border']
    }
  },
  {
    name: 'Verdure Élégante',
    slug: 'verdure-elegante',
    description: 'Design nature avec feuillages verts et eucalyptus. Idéal pour un mariage en plein air.',
    category: 'MODERN',
    isPremium: false,
    previewImage: '/uploads/templates/5340647.jpg',
    thumbnail: '/uploads/templates/5340647.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#4A7C59',
      secondary: '#E8F0E4',
      accent: '#C4956A',
      background: '#FAFFF8'
    },
    config: {
      colors: {
        primary: '#4A7C59',
        secondary: '#E8F0E4',
        background: '#FAFFF8',
        text: '#2C3E2C',
        accent: '#C4956A'
      },
      fonts: {
        heading: 'Cormorant Garamond, serif',
        body: 'Open Sans, sans-serif',
        script: 'Dancing Script, cursive'
      },
      layout: {
        style: 'greenery',
        borderRadius: '16px',
        padding: '40px'
      },
      decorations: ['eucalyptus-corners', 'leaf-border']
    }
  },
  {
    name: 'Royal Bordeaux',
    slug: 'royal-bordeaux',
    description: 'Template luxueux aux tons bordeaux et or. Un design majestueux pour les grandes célébrations.',
    category: 'ELEGANT',
    isPremium: true,
    previewImage: '/uploads/templates/6888828.jpg',
    thumbnail: '/uploads/templates/6888828.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#800020',
      secondary: '#F5E6D3',
      accent: '#D4AF37',
      background: '#FDF5F0'
    },
    config: {
      colors: {
        primary: '#800020',
        secondary: '#F5E6D3',
        background: '#FDF5F0',
        text: '#2C1810',
        accent: '#D4AF37'
      },
      fonts: {
        heading: 'Cinzel, serif',
        body: 'Raleway, sans-serif',
        script: 'Alex Brush, cursive'
      },
      layout: {
        style: 'royal',
        borderRadius: '0px',
        padding: '50px'
      },
      decorations: ['gold-ornaments', 'royal-crest']
    }
  },
  {
    name: 'Minimaliste Chic',
    slug: 'minimaliste-chic',
    description: 'Design épuré et moderne avec une typographie raffinée. La beauté dans la simplicité.',
    category: 'MINIMALIST',
    isPremium: false,
    previewImage: '/uploads/templates/7060382.jpg',
    thumbnail: '/uploads/templates/7060382.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#1a1a1a',
      secondary: '#F5F5F5',
      accent: '#D4AF37',
      background: '#FFFFFF'
    },
    config: {
      colors: {
        primary: '#1a1a1a',
        secondary: '#F5F5F5',
        background: '#FFFFFF',
        text: '#333333',
        accent: '#D4AF37'
      },
      fonts: {
        heading: 'Didot, serif',
        body: 'Helvetica Neue, sans-serif',
        script: 'Italianno, cursive'
      },
      layout: {
        style: 'minimal',
        borderRadius: '0px',
        padding: '60px'
      },
      decorations: ['thin-lines', 'geometric']
    }
  },
  {
    name: 'Jardin Enchanté',
    slug: 'jardin-enchante',
    description: 'Magnifique design avec des compositions florales luxuriantes. Un véritable jardin de rêves.',
    category: 'ROMANTIC',
    isPremium: true,
    previewImage: '/uploads/templates/7487928.jpg',
    thumbnail: '/uploads/templates/7487928.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#D4758C',
      secondary: '#FDE8EE',
      accent: '#3D6B4F',
      background: '#FFFBFB'
    },
    config: {
      colors: {
        primary: '#D4758C',
        secondary: '#FDE8EE',
        background: '#FFFBFB',
        text: '#3A2A2E',
        accent: '#3D6B4F'
      },
      fonts: {
        heading: 'Playfair Display, serif',
        body: 'Source Sans Pro, sans-serif',
        script: 'Parisienne, cursive'
      },
      layout: {
        style: 'garden',
        borderRadius: '24px',
        padding: '40px'
      },
      decorations: ['lush-flowers', 'vine-border']
    }
  },
  {
    name: 'Tropicale Luxe',
    slug: 'tropicale-luxe',
    description: 'Invitation tropicale avec des feuilles exotiques et des fleurs vibrantes. Ambiance destination wedding.',
    category: 'MODERN',
    isPremium: true,
    previewImage: '/uploads/templates/7498879.jpg',
    thumbnail: '/uploads/templates/7498879.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#2D7D46',
      secondary: '#E8F5E9',
      accent: '#FF6B6B',
      background: '#F5FFF5'
    },
    config: {
      colors: {
        primary: '#2D7D46',
        secondary: '#E8F5E9',
        background: '#F5FFF5',
        text: '#1B3A26',
        accent: '#FF6B6B'
      },
      fonts: {
        heading: 'Abril Fatface, serif',
        body: 'Poppins, sans-serif',
        script: 'Sacramento, cursive'
      },
      layout: {
        style: 'tropical',
        borderRadius: '20px',
        padding: '36px'
      },
      decorations: ['palm-leaves', 'tropical-flowers']
    }
  },
  {
    name: 'Pastel Douceur',
    slug: 'pastel-douceur',
    description: 'Template aux couleurs pastel douces et harmonieuses. Un design tendre et délicat.',
    category: 'ROMANTIC',
    isPremium: false,
    previewImage: '/uploads/templates/7499684.jpg',
    thumbnail: '/uploads/templates/7499684.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#B8A9C9',
      secondary: '#F0E6F6',
      accent: '#E8B4BC',
      background: '#FEFBFF'
    },
    config: {
      colors: {
        primary: '#B8A9C9',
        secondary: '#F0E6F6',
        background: '#FEFBFF',
        text: '#4A3F55',
        accent: '#E8B4BC'
      },
      fonts: {
        heading: 'Cormorant Garamond, serif',
        body: 'Quicksand, sans-serif',
        script: 'Tangerine, cursive'
      },
      layout: {
        style: 'pastel',
        borderRadius: '28px',
        padding: '36px'
      },
      decorations: ['soft-florals', 'pastel-border']
    }
  },
  {
    name: 'Classique Ivoire',
    slug: 'classique-ivoire',
    description: 'Design classique intemporel avec des tons ivoire et or. L\'élégance traditionnelle.',
    category: 'ELEGANT',
    isPremium: true,
    previewImage: '/uploads/templates/8044381.jpg',
    thumbnail: '/uploads/templates/8044381.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#D4AF37',
      secondary: '#FFFEF2',
      accent: '#8B7355',
      background: '#FFFEF8'
    },
    config: {
      colors: {
        primary: '#D4AF37',
        secondary: '#FFFEF2',
        background: '#FFFEF8',
        text: '#3D3425',
        accent: '#8B7355'
      },
      fonts: {
        heading: 'Cinzel Decorative, serif',
        body: 'EB Garamond, serif',
        script: 'Allura, cursive'
      },
      layout: {
        style: 'classic',
        borderRadius: '0px',
        padding: '50px'
      },
      decorations: ['classic-frame', 'gold-filigree']
    }
  },
  {
    name: 'Bohème Chic',
    slug: 'boheme-chic',
    description: 'Invitation bohème avec des éléments naturels et des tons terreux. Style libre et artistique.',
    category: 'MODERN',
    isPremium: false,
    previewImage: '/uploads/templates/8783566.jpg',
    thumbnail: '/uploads/templates/8783566.jpg',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#C4956A',
      secondary: '#F5EDE3',
      accent: '#6B8E6B',
      background: '#FFF9F3'
    },
    config: {
      colors: {
        primary: '#C4956A',
        secondary: '#F5EDE3',
        background: '#FFF9F3',
        text: '#4A3728',
        accent: '#6B8E6B'
      },
      fonts: {
        heading: 'Amatic SC, cursive',
        body: 'Josefin Sans, sans-serif',
        script: 'Satisfy, cursive'
      },
      layout: {
        style: 'bohemian',
        borderRadius: '16px',
        padding: '36px'
      },
      decorations: ['dried-flowers', 'boho-elements']
    }
  },
  {
    name: 'Signature Personnalisée',
    slug: 'signature-personnalisee',
    description: 'Template avec design personnalisé et signature artistique. Votre mariage, votre style unique.',
    category: 'MODERN',
    isPremium: true,
    previewImage: '/uploads/templates/JONATHAN_Yav.png',
    thumbnail: '/uploads/templates/JONATHAN_Yav.png',
    allowBackgroundChange: true,
    colorScheme: {
      primary: '#2C3E50',
      secondary: '#ECF0F1',
      accent: '#E74C3C',
      background: '#FFFFFF'
    },
    config: {
      colors: {
        primary: '#2C3E50',
        secondary: '#ECF0F1',
        background: '#FFFFFF',
        text: '#2C3E50',
        accent: '#E74C3C'
      },
      fonts: {
        heading: 'Playfair Display, serif',
        body: 'Montserrat, sans-serif',
        script: 'Dancing Script, cursive'
      },
      layout: {
        style: 'custom',
        borderRadius: '20px',
        padding: '40px'
      },
      decorations: ['custom-art', 'signature']
    }
  }
];

async function seedTemplates() {
  console.log('🎨 Seeding invitation templates...\n');

  let created = 0;
  let updated = 0;

  for (const tpl of templates) {
    try {
      const existing = await prisma.template.findUnique({
        where: { slug: tpl.slug }
      });

      if (existing) {
        await prisma.template.update({
          where: { slug: tpl.slug },
          data: {
            name: tpl.name,
            description: tpl.description,
            category: tpl.category,
            isPremium: tpl.isPremium,
            previewImage: tpl.previewImage,
            thumbnail: tpl.thumbnail,
            allowBackgroundChange: tpl.allowBackgroundChange,
            colorScheme: tpl.colorScheme,
            config: tpl.config,
            isActive: true
          }
        });
        console.log(`  ✏️  Updated: ${tpl.name}`);
        updated++;
      } else {
        await prisma.template.create({ data: tpl });
        console.log(`  ✅ Created: ${tpl.name}`);
        created++;
      }
    } catch (error) {
      console.error(`  ❌ Error with "${tpl.name}":`, error.message);
    }
  }

  console.log(`\n🎉 Templates seeding complete! Created: ${created}, Updated: ${updated}`);
}

seedTemplates()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
