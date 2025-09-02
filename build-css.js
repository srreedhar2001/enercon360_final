const fs = require('fs');
const path = require('path');
const tailwindcss = require('tailwindcss');

async function buildCSS() {
  try {
    const inputCSS = fs.readFileSync(path.join(__dirname, 'src/styles/input.css'), 'utf8');
    const result = await tailwindcss.compile(inputCSS);
    
    // Ensure the output directory exists
    const outputDir = path.join(__dirname, 'public/css');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Convert result to string properly
    const cssContent = result.css || result.toString();
    fs.writeFileSync(path.join(__dirname, 'public/css/style.css'), cssContent);
    console.log('✅ Tailwind CSS built successfully!');
  } catch (error) {
    console.error('❌ Error building Tailwind CSS:', error);
    
    // Fallback: Create a basic CSS file with Tailwind CDN approach
    console.log('📦 Creating fallback CSS...');
    const fallbackCSS = `
/* Tailwind CSS - Generated Fallback */
@import url('https://cdn.tailwindcss.com');

/* Custom styles can be added here */
.transition-all {
  transition: all 0.3s ease;
}
    `;
    
    const outputDir = path.join(__dirname, 'public/css');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(__dirname, 'public/css/style.css'), fallbackCSS);
    console.log('✅ Fallback CSS created!');
  }
}

buildCSS();
