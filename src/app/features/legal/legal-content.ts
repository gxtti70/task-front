/**
 * Contenido de los documentos legales. Es texto base estructurado conforme a la
 * Ley 1581 de 2012 y al Decreto 1074 de 2015 (Título 25, Sector Comercio).
 *
 * Los valores entre [CORCHETES] son marcadores que debe completar y validar un
 * abogado de la jurisdicción antes de publicar. La versión y la fecha de
 * vigencia NO se escriben aquí: provienen de /api/legal/versions para que front
 * y backend no diverjan.
 */
export type LegalVersionKey = 'termsVersion' | 'privacyVersion' | 'cookiesVersion';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface LegalDocument {
  id: string;
  versionKey: LegalVersionKey;
  title: string;
  summary: string;
  sections: LegalSection[];
}

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  terms: {
    id: 'terms',
    versionKey: 'termsVersion',
    title: 'Términos y Condiciones',
    summary: 'Reglas de uso del servicio TaskManager. Léelos antes de crear una cuenta.',
    sections: [
      {
        heading: '1. Identificación del proveedor',
        paragraphs: [
          'El servicio TaskManager es operado por [RAZÓN SOCIAL], identificada con NIT [NIT], con domicilio en [DOMICILIO] (en adelante, "el Proveedor").',
          'Canal de contacto para asuntos contractuales: [CORREO DE CONTACTO].'
        ]
      },
      {
        heading: '2. Objeto y aceptación',
        paragraphs: [
          'Estos Términos y Condiciones regulan el acceso y uso de la plataforma de gestión de proyectos y tareas TaskManager (en adelante, "el Servicio").',
          'La creación de una cuenta implica la aceptación plena de estos Términos y de la Política de Tratamiento de Datos Personales. Si no estás de acuerdo, no debes registrarte ni usar el Servicio.'
        ]
      },
      {
        heading: '3. Capacidad y cuenta',
        paragraphs: [
          'El Servicio está dirigido a personas mayores de 18 años con capacidad legal para contratar. Al registrarte declaras cumplir esta condición.',
          'Eres responsable de la veracidad de los datos suministrados y de la custodia de tus credenciales. Toda actividad realizada con tu cuenta se entiende realizada por ti.'
        ]
      },
      {
        heading: '4. Uso aceptable',
        paragraphs: ['Te comprometes a no utilizar el Servicio para:'],
        list: [
          'Vulnerar derechos de terceros o la normatividad aplicable.',
          'Introducir código malicioso, intentar accesos no autorizados o degradar la disponibilidad del Servicio.',
          'Almacenar contenido ilícito, incluidos datos sensibles de terceros sin base legal.',
          'Realizar ingeniería inversa, reventa o explotación no autorizada de la plataforma.'
        ]
      },
      {
        heading: '5. Planes, precios y pagos',
        paragraphs: [
          'El Servicio ofrece planes gratuitos y de pago. Los precios, características y límites de cada plan se publican en la plataforma y pueden actualizarse con preaviso razonable.',
          'Los pagos se procesan a través de [PASARELA DE PAGO]. El Proveedor no almacena datos completos de tarjetas. Las condiciones de facturación, renovación y reembolso se rigen por lo señalado en la pasarela y en la legislación de protección al consumidor.'
        ]
      },
      {
        heading: '6. Propiedad intelectual',
        paragraphs: [
          'El software, las marcas y los elementos gráficos del Servicio son titularidad del Proveedor o de sus licenciantes.',
          'El contenido que cargas (proyectos, tareas, comentarios) sigue siendo tuyo. Otorgas al Proveedor una licencia limitada para alojarlo y procesarlo con la única finalidad de prestar el Servicio.'
        ]
      },
      {
        heading: '7. Suspensión y terminación',
        paragraphs: [
          'El Proveedor puede suspender o terminar el acceso ante incumplimiento de estos Términos o uso que comprometa la seguridad del Servicio.',
          'Puedes terminar la relación en cualquier momento eliminando tu cuenta. La eliminación y la conservación residual de datos se rigen por la Política de Tratamiento de Datos Personales.'
        ]
      },
      {
        heading: '8. Limitación de responsabilidad',
        paragraphs: [
          'El Servicio se presta "tal cual". En la máxima medida permitida por la ley, el Proveedor no responde por daños indirectos, lucro cesante ni pérdida de datos derivados del uso o de la imposibilidad de uso.',
          'Nada en esta cláusula limita los derechos irrenunciables del consumidor ni las responsabilidades que la ley no permita excluir.'
        ]
      },
      {
        heading: '9. Modificaciones',
        paragraphs: [
          'El Proveedor puede actualizar estos Términos. Los cambios materiales se comunicarán y, cuando corresponda, requerirán una nueva aceptación. La versión vigente y su fecha de entrada están siempre disponibles en la plataforma.'
        ]
      },
      {
        heading: '10. Ley aplicable y jurisdicción',
        paragraphs: [
          'Estos Términos se rigen por las leyes de la República de Colombia. Las controversias se someterán a los jueces competentes de [CIUDAD], sin perjuicio de las normas de protección al consumidor.'
        ]
      }
    ]
  },
  privacy: {
    id: 'privacy',
    versionKey: 'privacyVersion',
    title: 'Política de Tratamiento de Datos Personales',
    summary: 'Cómo tratamos tus datos personales, con qué finalidades y cómo ejercer tus derechos.',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        paragraphs: [
          'El responsable del tratamiento es [RAZÓN SOCIAL], NIT [NIT], domicilio [DOMICILIO].',
          'Área y canal para el ejercicio de derechos y consultas: [ÁREA DE PROTECCIÓN DE DATOS], correo [CORREO DE PRIVACIDAD], teléfono [TELÉFONO], dirección [DIRECCIÓN].'
        ]
      },
      {
        heading: '2. Marco normativo',
        paragraphs: [
          'Esta Política se expide en cumplimiento de la Ley 1581 de 2012, el Decreto 1074 de 2015 (Título 25, Sector Comercio), la Circular Única de la Superintendencia de Industria y Comercio y demás normas concordantes.'
        ]
      },
      {
        heading: '3. Datos personales tratados',
        paragraphs: ['Tratamos las siguientes categorías de datos:'],
        list: [
          'Identificación y contacto: nombre completo y correo electrónico.',
          'Credenciales: contraseña almacenada únicamente en forma de hash (bcrypt).',
          'Perfil: imagen de avatar, zona horaria, preferencias y texto de biografía que decidas completar.',
          'Contenido: proyectos, tareas y comentarios que creas dentro del Servicio.',
          'Datos técnicos de sesión: identificadores de token de refresco (en hash), fecha y dirección IP de la conexión, y agente de usuario, con fines de seguridad y de prueba de autorización.'
        ]
      },
      {
        heading: '4. Finalidades del tratamiento',
        paragraphs: ['Tus datos se tratan para las siguientes finalidades:'],
        list: [
          'Crear y administrar tu cuenta y prestar el Servicio.',
          'Gestionar la autenticación, la seguridad y la prevención de fraudes o abusos.',
          'Emitir comunicaciones operativas (recuperación de contraseña, avisos del Servicio).',
          'Gestionar la suscripción y los pagos cuando contratas un plan de pago.',
          'Atender consultas, reclamos y el ejercicio de tus derechos.',
          'Cumplir obligaciones legales, contables y tributarias.'
        ]
      },
      {
        heading: '5. Autorización',
        paragraphs: [
          'Al registrarte otorgas tu autorización previa, expresa e informada para las finalidades descritas. El sistema conserva prueba de la autorización (documento, versión, fecha, dirección IP y agente de usuario).',
          'Puedes revocar la autorización en cualquier momento salvo cuando exista un deber legal de conservar los datos.'
        ]
      },
      {
        heading: '6. Encargados y transmisión internacional',
        paragraphs: [
          'Nos apoyamos en terceros que tratan datos por nuestra cuenta y bajo instrucciones contractuales: proveedor de infraestructura en la nube (almacenamiento y correo), pasarela de pagos y proveedor de envío de correo transaccional.',
          'Algunos encargados se encuentran fuera de Colombia, por lo que puede existir una transmisión internacional de datos. En esos casos se suscriben cláusulas contractuales que imponen al receptor deberes equivalentes a los de esta Política, conforme al Decreto 1074 de 2015.',
          'La relación completa de encargados y sus ubicaciones se detalla en el Anexo de Encargados disponible en la plataforma.'
        ]
      },
      {
        heading: '7. Derechos del titular',
        paragraphs: ['Como titular de los datos puedes:'],
        list: [
          'Conocer, acceder y obtener copia de tus datos personales.',
          'Actualizar y rectificar tus datos.',
          'Solicitar la supresión de datos cuando no exista deber legal o contractual de conservarlos.',
          'Revocar la autorización otorgada.',
          'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).'
        ]
      },
      {
        heading: '8. Procedimiento para ejercer tus derechos',
        paragraphs: [
          'Puedes ejercer tus derechos a través del canal de privacidad indicado en el numeral 1 o desde las opciones de tu cuenta.',
          'Las consultas se atienden dentro de los diez (10) días hábiles siguientes a su recibo, prorrogables por cinco (5) días hábiles más. Los reclamos se atienden dentro de los quince (15) días hábiles siguientes, prorrogables por ocho (8) días hábiles más.'
        ]
      },
      {
        heading: '9. Retención de los datos',
        paragraphs: [
          'Conservamos los datos mientras exista la relación y durante los plazos exigidos por obligaciones legales, contables o tributarias. Agotados dichos plazos, los datos se suprimen o se anonimizan de forma irreversible.',
          'Los identificadores de sesión expirados o revocados se eliminan conforme a la política de retención técnica.'
        ]
      },
      {
        heading: '10. Seguridad',
        paragraphs: [
          'Aplicamos medidas técnicas y organizativas razonables: cifrado de contraseñas, tokens almacenados en hash, control de acceso, límite de intentos de autenticación y registro de eventos de seguridad.'
        ]
      },
      {
        heading: '11. Menores de edad',
        paragraphs: [
          'El Servicio no está dirigido a menores de 18 años. No tratamos conscientemente datos de menores; si detectamos un registro en esas condiciones, procederemos a su supresión.'
        ]
      },
      {
        heading: '12. Vigencia y modificaciones',
        paragraphs: [
          'Esta Política rige desde su fecha de entrada en vigencia. Las modificaciones materiales se comunicarán y podrán requerir una nueva autorización. La versión vigente está siempre publicada en la plataforma.'
        ]
      }
    ]
  },
  cookies: {
    id: 'cookies',
    versionKey: 'cookiesVersion',
    title: 'Política de Cookies',
    summary: 'Qué cookies usamos, para qué y cómo gestionarlas.',
    sections: [
      {
        heading: '1. Qué son las cookies',
        paragraphs: [
          'Las cookies son pequeños archivos que el navegador almacena al visitar un sitio. Usamos únicamente cookies estrictamente necesarias para la seguridad y el funcionamiento del Servicio; por su naturaleza, no requieren consentimiento previo, pero sí esta divulgación.'
        ]
      },
      {
        heading: '2. Cookies utilizadas',
        paragraphs: ['El Servicio emplea las siguientes cookies:'],
        list: [
          'access_token — cookie httpOnly con el token de acceso de la sesión. Finalidad: autenticación. Duración: minutos.',
          'refresh_token — cookie httpOnly con el token de refresco rotativo. Finalidad: mantener la sesión de forma segura. Duración: días.',
          'XSRF-TOKEN — cookie legible por JavaScript con el token anti-CSRF. Finalidad: protección frente a falsificación de peticiones. Duración: sesión.'
        ]
      },
      {
        heading: '3. Cookies de terceros y analítica',
        paragraphs: [
          'A la fecha no utilizamos cookies de analítica, publicidad ni perfilamiento. Si en el futuro incorporamos cookies no necesarias, se solicitará tu consentimiento previo mediante un mecanismo específico y se actualizará esta Política.'
        ]
      },
      {
        heading: '4. Cómo gestionarlas',
        paragraphs: [
          'Puedes eliminar o bloquear cookies desde la configuración de tu navegador. Ten en cuenta que bloquear las cookies estrictamente necesarias impedirá iniciar sesión y usar el Servicio.'
        ]
      }
    ]
  }
};
