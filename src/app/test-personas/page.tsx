"use client";

import { useState, useEffect } from 'react';
import { getPersonaTemplate } from '../lib/personaUtils';
import Link from 'next/link';

// Styles for highlighting persona differences
const styles = {
  added: { color: 'green', fontWeight: 'bold' },
  highlight: { backgroundColor: '#faf3dd' }
};

export default function TestPersonas() {
  const [selectedPersona, setSelectedPersona] = useState('ariastar');
  const [language, setLanguage] = useState('en');
  const [sampleContent, setSampleContent] = useState('');
  const [personaTemplate, setPersonaTemplate] = useState('');

  const personas = [
    { id: 'ariastar', name: 'AriaStar (Relatable Best Friend)' },
    { id: 'specialist_mentor', name: 'MentorPro (Specialist Mentor)' },
    { id: 'ai_collaborator', name: 'AllInsight (AI Collaboration Showcaser)' },
    { id: 'synthesis_maker', name: 'SynthesisSage (Synthesis Sense-Maker)' },
    { id: 'sustainable_advocate', name: 'EcoEssence (Sustainable Lifestyle Advocate)' },
    { id: 'data_visualizer', name: 'DataStory (Real-time Data Visualizer)' },
    { id: 'multiverse_curator', name: 'NexusVerse (Multiverse Experience Curator)' },
    { id: 'ethical_tech', name: 'TechTranslate (Ethical Tech Translator)' },
    { id: 'niche_community', name: 'CommunityForge (Niche Community Cultivator)' }
  ];

  // Create sample content based on language
  const generateSpecializedContent = (lang: string) => {
    if (lang === 'es') {
      return `
# Consejos para la productividad digital

La productividad en un mundo digital puede ser complicada. Hay tantas distracciones y herramientas que a veces es difícil mantenerse enfocado en lo que realmente importa.

## Consejos principales

1. Establece horarios específicos para revisar el correo electrónico
2. Utiliza la técnica Pomodoro para mantener el enfoque
3. Elimina las notificaciones no esenciales
4. Organiza tu espacio de trabajo digital
5. Toma descansos regulares para mantener la mente fresca

## Beneficios de un sistema organizado

Cuando tienes un sistema digital organizado, puedes:
- Encontrar información más rápidamente
- Reducir el estrés relacionado con la sobrecarga de información
- Mejorar la colaboración con los demás
- Mantener un mejor equilibrio entre el trabajo y la vida personal

## Caso de estudio

Un cliente mío luchaba con más de 1000 correos electrónicos sin leer y sentía que nunca podía ponerse al día. Después de implementar un sistema de revisión programada y establecer filtros efectivos, logró reducir su bandeja de entrada a cero en solo una semana.

## Errores comunes a evitar

El error más común que veo es intentar procesar correos electrónicos a lo largo del día. Esto interrumpe constantemente tu flujo de trabajo y reduce significativamente tu productividad general.

¿Qué consejo te ha funcionado mejor para mantener tu productividad digital?
`;
    } else {
      return `
# Digital Productivity Tips

Productivity in a digital world can be challenging. With so many distractions and tools, it's sometimes hard to stay focused on what truly matters.

## Key Tips

1. Set specific times to check email
2. Use the Pomodoro technique to maintain focus
3. Eliminate non-essential notifications
4. Organize your digital workspace
5. Take regular breaks to keep your mind fresh

## Benefits of an Organized System

When you have an organized digital system, you can:
- Find information more quickly
- Reduce stress related to information overload
- Improve collaboration with others
- Maintain a better work-life balance

## Case Study

One of my clients was struggling with over 1000 unread emails and felt they could never catch up. After implementing a scheduled review system and setting up effective filters, they were able to get to inbox zero within just one week.

## Common Mistakes to Avoid

The most common mistake I see is trying to process emails throughout the day. This constantly interrupts your workflow and significantly reduces your overall productivity.

What tip has worked best for you in maintaining your digital productivity?
`;
    }
  };

  // Update sample content when language changes
  useEffect(() => {
    setSampleContent(generateSpecializedContent(language));
  }, [language]);

  // Update persona template when persona or language changes
  useEffect(() => {
    if (selectedPersona) {
      const template = getPersonaTemplate(selectedPersona, language);
      setPersonaTemplate(template || 'No template available for this persona');
    }
  }, [selectedPersona, language]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Persona Template Viewer</h1>
      <p className="mb-4">This page shows the instructions and templates for each persona in both English and Spanish.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Persona:</label>
            <select 
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {personas.map(persona => (
                <option key={persona.id} value={persona.id}>{persona.name}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Language:</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="en"
                  checked={language === 'en'}
                  onChange={() => setLanguage('en')}
                  className="mr-2"
                />
                English
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="es"
                  checked={language === 'es'}
                  onChange={() => setLanguage('es')}
                  className="mr-2"
                />
                Spanish
              </label>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Sample Content:</label>
            <textarea
              value={sampleContent}
              onChange={(e) => setSampleContent(e.target.value)}
              className="w-full p-2 border rounded font-mono text-sm h-60"
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-2">Persona Template:</h2>
          <div className="p-4 border rounded bg-gray-50 overflow-auto h-[600px] whitespace-pre-wrap font-mono text-sm">
            {personaTemplate || 'Select a persona to see its template.'}
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg mb-8">
        <h2 className="text-lg font-bold mb-2">How Personas Work</h2>
        <p>This tool shows the template instructions sent to Claude which guide how content is generated in each persona's style:</p>
        <ul className="list-disc pl-6 mt-2">
          <li>These templates define the <span style={styles.highlight}>voice, tone, and characteristics</span> of each persona</li>
          <li>The AI model (Claude) receives these instructions and generates content that matches the persona style</li>
          <li>After generation, minimal styling enhancements are applied to reinforce the persona's characteristics</li>
          <li>Our recent updates <span style={styles.added}>removed hard-coded phrases</span> and let the AI be more natural while maintaining each persona's voice</li>
        </ul>
      </div>
      
      <div className="mt-8">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  );
} 