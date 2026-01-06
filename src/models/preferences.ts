import mongoose, { Schema, Document } from 'mongoose';

// Definimos la interfaz para las preferencias (usando tu nombre original IPreferences)
export interface IPreferences extends Document {
  userId: string;
  email: string;
  
  // 1. Switch global de emails (Tu campo original, renombrado para claridad)
  globalEmailNotifications: boolean;                     
  
  // 2. Lógica para Resúmenes Periódicos (Requisito Serverless)
  emailSummaryFrequency: 'daily' | 'weekly' | 'never'; // Frecuencia de envío de resúmenes
  lastSummarySent: Date;                               // Fecha del último resumen enviado
  
  // 3. Lógica para Alertas Inmediatas (Event-Driven)
  alertOnExpenseCreation: boolean;                     // Recibir alerta inmediata cuando se crea un gasto (Usado en handleRedisEvent)
  alertOnBalanceChange: boolean;                       // Recibir alerta cuando su deuda cambia
  alertOnNewGroup: boolean;                            // Recibir alerta cuando se le añade a un nuevo grupo
  alertOnLowBudget: boolean;                           // Recibir alerta de presupuesto bajo (si Analytics lo publica)
}

// Esquema de Mongoose para las preferencias
const PreferencesSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true }, // ID de usuario único
  email: { type: String, required: true },
  
  // Mapeo de tu campo original a la nomenclatura avanzada
  globalEmailNotifications: { type: Boolean, required: true, default: true },
  
  // Summary logic
  emailSummaryFrequency: { 
    type: String, 
    enum: ['daily', 'weekly', 'never'], 
    default: 'weekly' 
  },
  lastSummarySent: { type: Date, default: () => new Date(0) }, 
  
  // Immediate Alerts logic
  alertOnExpenseCreation: { type: Boolean, default: true },
  alertOnBalanceChange: { type: Boolean, default: true },
  alertOnNewGroup: { type: Boolean, default: true },
  alertOnLowBudget: { type: Boolean, default: true },
});

// Exportamos el modelo de preferencias
const Preferences = mongoose.model<IPreferences>("Preferences", PreferencesSchema);
export default Preferences;