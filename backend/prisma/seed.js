const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Plans
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { name: 'Basic' },
      update: {},
      create: {
        name: 'Basic',
        type: 'BASIC',
        price: 29.99,
        maxGuests: 100,
        maxTemplates: 3,
        customDomain: false,
        whatsappEnabled: false,
        emailEnabled: true,
        pdfEnabled: true,
        analyticsEnabled: false,
        prioritySupport: false,
        description: 'Perfect for intimate weddings',
        features: JSON.stringify([
          '100 invités maximum',
          '3 templates disponibles',
          'QR Codes individuels',
          'Export PDF',
          'Support email'
        ])
      }
    }),
    prisma.plan.upsert({
      where: { name: 'Premium' },
      update: {},
      create: {
        name: 'Premium',
        type: 'PREMIUM',
        price: 79.99,
        maxGuests: 300,
        maxTemplates: 10,
        customDomain: false,
        whatsappEnabled: true,
        emailEnabled: true,
        pdfEnabled: true,
        analyticsEnabled: true,
        prioritySupport: false,
        description: 'Ideal for medium to large weddings',
        features: JSON.stringify([
          '300 invités maximum',
          '10 templates disponibles',
          'QR Codes individuels',
          'Export PDF & ZIP',
          'Envoi WhatsApp',
          'Analytics dashboard',
          'Support prioritaire'
        ])
      }
    }),
    prisma.plan.upsert({
      where: { name: 'VIP' },
      update: {},
      create: {
        name: 'VIP',
        type: 'VIP',
        price: 149.99,
        maxGuests: 1000,
        maxTemplates: -1,
        customDomain: true,
        whatsappEnabled: true,
        emailEnabled: true,
        pdfEnabled: true,
        analyticsEnabled: true,
        prioritySupport: true,
        description: 'The ultimate wedding experience',
        features: JSON.stringify([
          '1000 invités maximum',
          'Tous les templates',
          'Domaine personnalisé',
          'QR Codes individuels',
          'Export PDF & ZIP',
          'Envoi WhatsApp & Email',
          'Analytics avancés',
          'Support VIP 24/7',
          'Logo personnalisé'
        ])
      }
    })
  ]);

  console.log('✅ Plans created:', plans.map(p => p.name));

  // Create Super Admin User
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@weddinginvite.pro' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'admin@weddinginvite.pro',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      preferredLanguage: 'fr'
    }
  });

  console.log('✅ Super Admin user created:', adminUser.email);

  // Create Demo Client
  const clientPassword = await bcrypt.hash('Client@123', 12);
  const demoClient = await prisma.user.upsert({
    where: { email: 'demo@weddinginvite.pro' },
    update: {},
    create: {
      email: 'demo@weddinginvite.pro',
      password: clientPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'CLIENT',
      status: 'ACTIVE',
      emailVerified: true,
      preferredLanguage: 'fr'
    }
  });

  console.log('✅ Demo client created:', demoClient.email);

  // Create Templates
  const templates = await Promise.all([
    prisma.template.upsert({
      where: { slug: 'elegant-gold' },
      update: {
        config: {
          colors: {
            primary: '#D4AF37',
            secondary: '#F5E6C8',
            background: '#FDF8F0',
            text: '#1a1a1a',
            accent: '#B8860B'
          },
          fonts: {
            heading: 'Playfair Display, serif',
            body: 'Montserrat, sans-serif',
            script: 'Great Vibes, cursive'
          },
          layout: {
            headerHeight: '200px',
            borderRadius: '24px',
            padding: '40px'
          }
        }
      },
      create: {
        name: 'Elegant Gold',
        slug: 'elegant-gold',
        description: 'Un design élégant avec des accents dorés',
        category: 'ELEGANT',
        isPremium: false,
        thumbnail: '/templates/elegant-gold/thumbnail.jpg',
        colorScheme: {
          primary: '#D4AF37',
          secondary: '#F5E6C8',
          accent: '#1a1a1a',
          background: '#FDF8F0'
        },
        config: {
          colors: {
            primary: '#D4AF37',
            secondary: '#F5E6C8',
            background: '#FDF8F0',
            text: '#1a1a1a',
            accent: '#B8860B'
          },
          fonts: {
            heading: 'Playfair Display, serif',
            body: 'Montserrat, sans-serif',
            script: 'Great Vibes, cursive'
          },
          layout: {
            headerHeight: '200px',
            borderRadius: '24px',
            padding: '40px'
          }
        },
        htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{bride_name}} & {{groom_name}} - Invitation</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet">
  <style>{{css_content}}</style>
</head>
<body>
  <div class="invitation-container">
    <div class="invitation-header">
      <div class="ornament top"></div>
      <p class="subtitle">Nous avons le plaisir de vous inviter au mariage de</p>
    </div>
    
    <div class="couple-names">
      <h1 class="bride-name">{{bride_name}}</h1>
      <span class="ampersand">&</span>
      <h1 class="groom-name">{{groom_name}}</h1>
    </div>
    
    <div class="wedding-details">
      <div class="date-section">
        <p class="label">Date</p>
        <p class="value">{{date}}</p>
      </div>
      
      <div class="time-section">
        <p class="label">Heure</p>
        <p class="value">{{time}}</p>
      </div>
      
      <div class="location-section">
        <p class="label">Lieu</p>
        <p class="value venue-name">{{venue_name}}</p>
        <p class="value venue-address">{{venue_address}}</p>
      </div>
    </div>
    
    <div class="custom-message">
      <p>{{custom_message}}</p>
    </div>
    
    <div class="guest-section">
      <p class="guest-name">Cher(e) {{guest_name}}</p>
      <p class="table-info">Table N° {{table_number}}</p>
    </div>
    
    <div class="qr-section">
      <p class="qr-label">Scannez pour confirmer votre présence</p>
      <div class="qr-code">{{qr_code}}</div>
    </div>
    
    <div class="rsvp-section">
      <p>RSVP avant le {{rsvp_date}}</p>
    </div>
    
    <div class="invitation-footer">
      <div class="ornament bottom"></div>
    </div>
  </div>
</body>
</html>`,
        cssContent: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Montserrat', sans-serif;
  background: linear-gradient(135deg, #FDF8F0 0%, #F5EBD9 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.invitation-container {
  max-width: 600px;
  width: 100%;
  background: #FFFFFF;
  border-radius: 20px;
  padding: 60px 40px;
  box-shadow: 0 25px 80px rgba(212, 175, 55, 0.15);
  text-align: center;
  position: relative;
  border: 2px solid #D4AF37;
}

.ornament {
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #D4AF37, transparent);
  margin: 0 auto 30px;
}

.ornament.bottom {
  margin: 30px auto 0;
}

.subtitle {
  font-size: 14px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 30px;
}

.couple-names {
  margin: 40px 0;
}

.bride-name, .groom-name {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: 2px;
}

.ampersand {
  font-family: 'Playfair Display', serif;
  font-size: 36px;
  color: #D4AF37;
  display: block;
  margin: 10px 0;
}

.wedding-details {
  margin: 40px 0;
  padding: 30px;
  background: #FDF8F0;
  border-radius: 15px;
}

.wedding-details > div {
  margin: 20px 0;
}

.label {
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #D4AF37;
  margin-bottom: 5px;
}

.value {
  font-size: 18px;
  color: #1a1a1a;
  font-weight: 500;
}

.venue-address {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.custom-message {
  font-style: italic;
  color: #666;
  font-size: 16px;
  margin: 30px 0;
  padding: 20px;
  border-left: 3px solid #D4AF37;
  background: #FDF8F0;
}

.guest-section {
  margin: 30px 0;
  padding: 20px;
  background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%);
  border-radius: 10px;
  color: white;
}

.guest-name {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  margin-bottom: 10px;
}

.table-info {
  font-size: 14px;
  opacity: 0.9;
}

.qr-section {
  margin: 40px 0;
}

.qr-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 15px;
}

.qr-code {
  display: inline-block;
  padding: 15px;
  background: white;
  border: 2px solid #D4AF37;
  border-radius: 10px;
}

.qr-code img {
  width: 150px;
  height: 150px;
}

.rsvp-section {
  font-size: 14px;
  color: #666;
  margin-top: 30px;
}`
      }
    }),
    prisma.template.upsert({
      where: { slug: 'romantic-floral' },
      update: {
        config: {
          colors: {
            primary: '#E8B4BC',
            secondary: '#F8E1E4',
            background: '#FFF9F9',
            text: '#4A3F3F',
            accent: '#2D5016'
          },
          fonts: {
            heading: 'Great Vibes, cursive',
            body: 'Lato, sans-serif',
            script: 'Great Vibes, cursive'
          },
          layout: {
            headerHeight: '180px',
            borderRadius: '28px',
            padding: '36px'
          }
        }
      },
      create: {
        name: 'Romantic Floral',
        slug: 'romantic-floral',
        description: 'Design romantique avec motifs floraux',
        category: 'ROMANTIC',
        isPremium: false,
        thumbnail: '/templates/romantic-floral/thumbnail.jpg',
        colorScheme: {
          primary: '#E8B4BC',
          secondary: '#F8E1E4',
          accent: '#2D5016',
          background: '#FFF9F9'
        },
        config: {
          colors: {
            primary: '#E8B4BC',
            secondary: '#F8E1E4',
            background: '#FFF9F9',
            text: '#4A3F3F',
            accent: '#2D5016'
          },
          fonts: {
            heading: 'Great Vibes, cursive',
            body: 'Lato, sans-serif',
            script: 'Great Vibes, cursive'
          },
          layout: {
            headerHeight: '180px',
            borderRadius: '28px',
            padding: '36px'
          }
        },
        htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{bride_name}} & {{groom_name}} - Invitation</title>
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Lato:wght@300;400&display=swap" rel="stylesheet">
  <style>{{css_content}}</style>
</head>
<body>
  <div class="invitation-card">
    <div class="floral-border top-left"></div>
    <div class="floral-border top-right"></div>
    
    <div class="invitation-content">
      <p class="save-date">Save the Date</p>
      
      <div class="names">
        <h1>{{bride_name}}</h1>
        <span class="heart">♥</span>
        <h1>{{groom_name}}</h1>
      </div>
      
      <p class="invite-text">Nous serions honorés de votre présence à notre mariage</p>
      
      <div class="details-box">
        <div class="detail">
          <span class="icon">📅</span>
          <p>{{date}}</p>
        </div>
        <div class="detail">
          <span class="icon">⏰</span>
          <p>{{time}}</p>
        </div>
        <div class="detail">
          <span class="icon">📍</span>
          <p>{{venue_name}}<br><small>{{venue_address}}</small></p>
        </div>
      </div>
      
      <div class="message">{{custom_message}}</div>
      
      <div class="guest-info">
        <p>Invité(e) d'honneur</p>
        <h3>{{guest_name}}</h3>
        <p class="table">Table {{table_number}}</p>
      </div>
      
      <div class="qr-section">
        <div class="qr-wrapper">{{qr_code}}</div>
        <p>Confirmez votre présence</p>
      </div>
    </div>
    
    <div class="floral-border bottom-left"></div>
    <div class="floral-border bottom-right"></div>
  </div>
</body>
</html>`,
        cssContent: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Lato', sans-serif;
  background: linear-gradient(180deg, #FFF9F9 0%, #FFE8E8 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.invitation-card {
  max-width: 550px;
  width: 100%;
  background: white;
  border-radius: 30px;
  padding: 50px;
  position: relative;
  box-shadow: 0 20px 60px rgba(232, 180, 188, 0.3);
  overflow: hidden;
}

.floral-border {
  position: absolute;
  width: 100px;
  height: 100px;
  background: linear-gradient(45deg, #E8B4BC, #2D5016);
  opacity: 0.2;
}

.floral-border.top-left { top: 0; left: 0; border-radius: 0 0 100% 0; }
.floral-border.top-right { top: 0; right: 0; border-radius: 0 0 0 100%; }
.floral-border.bottom-left { bottom: 0; left: 0; border-radius: 0 100% 0 0; }
.floral-border.bottom-right { bottom: 0; right: 0; border-radius: 100% 0 0 0; }

.invitation-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.save-date {
  font-size: 14px;
  letter-spacing: 5px;
  text-transform: uppercase;
  color: #E8B4BC;
  margin-bottom: 20px;
}

.names h1 {
  font-family: 'Great Vibes', cursive;
  font-size: 52px;
  color: #333;
  font-weight: 400;
}

.heart {
  color: #E8B4BC;
  font-size: 30px;
  display: block;
  margin: 10px 0;
}

.invite-text {
  font-size: 14px;
  color: #666;
  margin: 30px 0;
  font-style: italic;
}

.details-box {
  background: #FFF9F9;
  border-radius: 20px;
  padding: 25px;
  margin: 25px 0;
}

.detail {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 15px 0;
}

.detail .icon {
  font-size: 20px;
}

.detail p {
  font-size: 16px;
  color: #333;
}

.detail small {
  color: #888;
  font-size: 13px;
}

.message {
  font-style: italic;
  color: #666;
  padding: 20px;
  margin: 20px 0;
  border-top: 1px dashed #E8B4BC;
  border-bottom: 1px dashed #E8B4BC;
}

.guest-info {
  background: linear-gradient(135deg, #E8B4BC, #D4A0A8);
  color: white;
  padding: 20px;
  border-radius: 15px;
  margin: 25px 0;
}

.guest-info p { opacity: 0.9; }
.guest-info h3 { font-size: 24px; margin: 10px 0; }
.guest-info .table { font-size: 14px; }

.qr-section {
  margin-top: 25px;
}

.qr-wrapper {
  display: inline-block;
  padding: 12px;
  background: white;
  border: 2px dashed #E8B4BC;
  border-radius: 15px;
}

.qr-wrapper img {
  width: 130px;
  height: 130px;
}

.qr-section p {
  font-size: 12px;
  color: #888;
  margin-top: 10px;
}`
      }
    }),
    prisma.template.upsert({
      where: { slug: 'modern-minimal' },
      update: {
        config: {
          colors: {
            primary: '#000000',
            secondary: '#E5C687',
            background: '#F5F5F5',
            text: '#1a1a1a',
            accent: '#E5C687'
          },
          fonts: {
            heading: 'Cormorant Garamond, serif',
            body: 'Josefin Sans, sans-serif',
            script: 'Cormorant Garamond, serif'
          },
          layout: {
            headerHeight: '160px',
            borderRadius: '0px',
            padding: '48px'
          }
        }
      },
      create: {
        name: 'Modern Minimal',
        slug: 'modern-minimal',
        description: 'Design moderne et minimaliste',
        category: 'MINIMALIST',
        isPremium: true,
        thumbnail: '/templates/modern-minimal/thumbnail.jpg',
        colorScheme: {
          primary: '#000000',
          secondary: '#E5C687',
          accent: '#E5C687',
          background: '#F5F5F5'
        },
        config: {
          colors: {
            primary: '#000000',
            secondary: '#E5C687',
            background: '#F5F5F5',
            text: '#1a1a1a',
            accent: '#E5C687'
          },
          fonts: {
            heading: 'Cormorant Garamond, serif',
            body: 'Josefin Sans, sans-serif',
            script: 'Cormorant Garamond, serif'
          },
          layout: {
            headerHeight: '160px',
            borderRadius: '0px',
            padding: '48px'
          }
        },
        htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{bride_name}} & {{groom_name}}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Josefin+Sans:wght@300;400&display=swap" rel="stylesheet">
  <style>{{css_content}}</style>
</head>
<body>
  <div class="invitation">
    <header>
      <div class="line"></div>
      <p class="invitation-type">INVITATION AU MARIAGE</p>
    </header>
    
    <main>
      <div class="couple">
        <h1>{{bride_name}}</h1>
        <span>&</span>
        <h1>{{groom_name}}</h1>
      </div>
      
      <div class="info-grid">
        <div class="info-item">
          <span class="label">DATE</span>
          <span class="value">{{date}}</span>
        </div>
        <div class="info-item">
          <span class="label">HEURE</span>
          <span class="value">{{time}}</span>
        </div>
        <div class="info-item full-width">
          <span class="label">LIEU</span>
          <span class="value">{{venue_name}}</span>
          <span class="sub-value">{{venue_address}}</span>
        </div>
      </div>
      
      <div class="guest-card">
        <span class="guest-label">INVITÉ</span>
        <span class="guest-name">{{guest_name}}</span>
        <span class="guest-table">TABLE {{table_number}}</span>
      </div>
      
      <div class="message-block">
        <p>{{custom_message}}</p>
      </div>
    </main>
    
    <footer>
      <div class="qr-container">
        {{qr_code}}
      </div>
      <p class="scan-text">SCANNER POUR RSVP</p>
      <div class="line"></div>
    </footer>
  </div>
</body>
</html>`,
        cssContent: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Josefin Sans', sans-serif;
  background: #F5F5F5;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.invitation {
  max-width: 500px;
  width: 100%;
  background: #FFFFFF;
  padding: 50px;
  box-shadow: 0 0 0 1px #000;
}

header, footer {
  text-align: center;
}

.line {
  width: 60px;
  height: 1px;
  background: #000;
  margin: 0 auto 20px;
}

footer .line {
  margin: 20px auto 0;
}

.invitation-type {
  font-size: 10px;
  letter-spacing: 4px;
  color: #000;
}

.couple {
  text-align: center;
  margin: 50px 0;
}

.couple h1 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 42px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 8px;
}

.couple span {
  font-family: 'Cormorant Garamond', serif;
  font-size: 32px;
  color: #E5C687;
  display: block;
  margin: 15px 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
  margin: 40px 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  padding: 30px 0;
}

.info-item {
  text-align: center;
}

.info-item.full-width {
  grid-column: span 2;
}

.label {
  display: block;
  font-size: 10px;
  letter-spacing: 3px;
  color: #999;
  margin-bottom: 8px;
}

.value {
  display: block;
  font-size: 18px;
  color: #000;
}

.sub-value {
  display: block;
  font-size: 13px;
  color: #666;
  margin-top: 5px;
}

.guest-card {
  background: #000;
  color: #fff;
  padding: 25px;
  text-align: center;
  margin: 30px 0;
}

.guest-label {
  font-size: 10px;
  letter-spacing: 3px;
  opacity: 0.7;
}

.guest-name {
  display: block;
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  margin: 10px 0;
  text-transform: uppercase;
  letter-spacing: 3px;
}

.guest-table {
  font-size: 12px;
  letter-spacing: 2px;
  background: #E5C687;
  color: #000;
  padding: 5px 15px;
  display: inline-block;
}

.message-block {
  text-align: center;
  padding: 25px;
  background: #FAFAFA;
  margin: 30px 0;
  font-style: italic;
  color: #666;
}

.qr-container {
  display: inline-block;
  padding: 10px;
  border: 1px solid #000;
}

.qr-container img {
  width: 120px;
  height: 120px;
}

.scan-text {
  font-size: 10px;
  letter-spacing: 3px;
  margin-top: 15px;
  color: #999;
}`
      }
    })
  ]);

  console.log('✅ Templates created:', templates.map(t => t.name));

  // Create Demo Coupon
  const coupon = await prisma.coupon.upsert({
    where: { code: 'WELCOME50' },
    update: {},
    create: {
      code: 'WELCOME50',
      description: '50% de réduction pour les nouveaux utilisateurs',
      discountType: 'percentage',
      discountValue: 50,
      maxUses: 100,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  });

  console.log('✅ Coupon created:', coupon.code);

  // Create Default Settings
  const settings = await Promise.all([
    prisma.setting.upsert({
      where: { key: 'site_name' },
      update: {},
      create: { key: 'site_name', value: 'WeddingInvite Pro', type: 'string' }
    }),
    prisma.setting.upsert({
      where: { key: 'site_description' },
      update: {},
      create: { key: 'site_description', value: 'Créez des invitations de mariage digitales uniques', type: 'string' }
    }),
    prisma.setting.upsert({
      where: { key: 'contact_email' },
      update: {},
      create: { key: 'contact_email', value: 'contact@weddinginvite.pro', type: 'string' }
    }),
    prisma.setting.upsert({
      where: { key: 'default_language' },
      update: {},
      create: { key: 'default_language', value: 'fr', type: 'string' }
    })
  ]);

  console.log('✅ Settings created:', settings.length);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('   Admin: admin@weddinginvite.pro / Admin@123');
  console.log('   Demo:  demo@weddinginvite.pro / Client@123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
