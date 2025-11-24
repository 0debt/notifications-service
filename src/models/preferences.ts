import mongoose, { Schema, Document } from "mongoose";

// Definimos la interfaz para las preferencias
export interface IPreferences extends Document {
  userId: string;
  email: string;
  emailNotifications: boolean;
}

// Definimos el esquema de preferencias
const PreferencesSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  emailNotifications: { type: Boolean, required: true, default: true },
});

// Exportamos el modelo de preferencias
const Preferences = mongoose.model<IPreferences>("Preferences", PreferencesSchema);
export default Preferences;