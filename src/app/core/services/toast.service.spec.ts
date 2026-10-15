import { describe, expect, it } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  it('maps network and plan limit errors to useful messages', () => {
    const service = new ToastService();
    service.errorFor({ status: 0 }, 'fallback');
    service.errorFor({ status: 402 }, 'fallback');
    expect(service.messages().map(message => message.message)).toEqual([
      'No se pudo conectar con el servidor. Comprueba que el backend esté activo.',
      'Has alcanzado el límite de tu plan. Elige un plan superior para continuar.'
    ]);
    service.messages().forEach(message => service.dismiss(message.id));
  });
});
