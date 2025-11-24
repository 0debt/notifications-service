// Importamos Mongoose y tipos de TypeScript
import mongoose, { Schema, Document } from 'mongoose'

// Definimos una interfaz para TypeScript que representa cómo será una notificación
// Esto ayuda a que nuestro código tenga autocompletado y verificación de tipos
export interface INotification extends Document {
  userId: string       // ID del usuario que recibe la notificación
  message: string      // Texto o contenido de la notificación
  read: boolean        // Indica si la notificación ya ha sido leída
  createdAt: Date      // Fecha de creación de la notificación
}

// Definimos el Schema de Mongoose, que indica cómo se guardará en MongoDB
const NotificationSchema: Schema = new Schema({
  userId: { type: String, required: true },          // Obligatorio, tipo String
  message: { type: String, required: true },         // Obligatorio, tipo String
  read: { type: Boolean, default: false },           // Por defecto false si no se especifica
  createdAt: { type: Date, default: Date.now }       // Por defecto la fecha actual
})

// Creamos el modelo de Mongoose a partir del Schema
// 'Notification' será el nombre de la colección (Mongo lo pluraliza automáticamente a 'notifications')
export default mongoose.model<INotification>('Notification', NotificationSchema)
