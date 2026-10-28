export function mensajeError(error: { code?: string; message: string }): string {
  if (error.code === '23505') return 'Ya existe un registro con ese nombre.'
  if (error.code === '23503') {
    return 'No se puede eliminar porque está en uso. Puedes despublicarlo en su lugar.'
  }
  if (error.code === '42501') return 'No tienes permiso para realizar esta acción.'
  return error.message
}
