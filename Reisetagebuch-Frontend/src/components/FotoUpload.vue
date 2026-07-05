<template>
  <div class="foto-bereich">

    <div class="upload-bereich">
      <label class="upload-label">
        📷 Fotos hinzufügen
        <input
          type="file"
          accept="image/*"
          multiple
          @change="fotosHochladen"
          style="display: none"
        />
      </label>
      <span v-if="laedt" class="lade-text">Wird hochgeladen...</span>
      <span v-if="fehler" class="fehler-text">{{ fehler }}</span>
    </div>

    <div v-if="fotos.length > 0" class="carousel">
      <button class="pfeil" @click="vorher" :disabled="aktuellerIndex === 0">‹</button>

      <div class="bild-container">
        <img :src="fotos[aktuellerIndex].imageData" :alt="fotos[aktuellerIndex].dateiname" />
        <button class="loeschen-btn" @click="fotoLoeschen(fotos[aktuellerIndex].id)">✕</button>
      </div>

      <button class="pfeil" @click="naechste" :disabled="aktuellerIndex === fotos.length - 1">›</button>
    </div>

    <div v-if="fotos.length > 0" class="zaehler">
      {{ aktuellerIndex + 1 }} / {{ fotos.length }}
    </div>

    <div v-if="fotos.length === 0 && !laedt" class="keine-fotos">
      Noch keine Fotos für diesen Eintrag.
    </div>

  </div>
</template>

<script>
const API = import.meta.env.VITE_APP_BACKEND_BASE_URL

/*Maximale Breite des Bildes in Pixeln nach der Verkleinerung*/
const MAX_BREITE = 900

/*JPEG Qualität: 0.0 = schlechteste, 1.0 = beste*/
/* 0.75 ist ein guter Kompromiss zwischen Qualität und Dateigröße*/
const JPEG_QUALITAET = 0.75

/*Maximale Dateigröße die hochgeladen werden darf (in MB)*/
/*Bilder größer als das werden abgelehnt BEVOR sie verkleinert werden*/
const MAX_MB_VOR_VERKLEINERUNG = 15

export default {
  name: 'FotoUpload',

  props: {
    entryId: {
      type: Number,
      required: true
    }
  },

  data() {
    return {
      fotos: [],
      aktuellerIndex: 0,
      laedt: false,
      fehler: ''
    }
  },

  mounted() {
    this.fotosLaden()
  },

  watch: {
    entryId() {
      this.aktuellerIndex = 0
      this.fotosLaden()
    }
  },

  methods: {
    async fotosLaden() {
      if (!this.entryId) return
      try {
        const res = await fetch(`${API}/entries/${this.entryId}/fotos`)
        this.fotos = await res.json()
      } catch (e) {
        console.error('Fehler beim Laden der Fotos:', e)
      }
    },

    vorher() {
      if (this.aktuellerIndex > 0) this.aktuellerIndex--
    },

    naechste() {
      if (this.aktuellerIndex < this.fotos.length - 1) this.aktuellerIndex++
    },

    async fotosHochladen(event) {
      this.fehler = ''
      this.laedt = true

      for (const datei of event.target.files) {

        /* Datei zu groß? Ablehnen bevor wir überhaupt anfangen */
        const groesseInMB = datei.size / 1024 / 1024
        if (groesseInMB > MAX_MB_VOR_VERKLEINERUNG) {
          this.fehler = `"${datei.name}" ist zu groß (${groesseInMB.toFixed(1)} MB). Bitte max. ${MAX_MB_VOR_VERKLEINERUNG} MB.`
          continue // nächste Datei probieren
        }

        /* Bild verkleinern und komprimieren */
        const klein = await this.bildVerkleinern(datei)
        const base64 = await this.zuBase64(klein)

        await fetch(`${API}/entries/${this.entryId}/fotos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: base64,
            dateiname: datei.name
          })
        })
      }

      this.laedt = false
      await this.fotosLaden()
      this.aktuellerIndex = Math.max(0, this.fotos.length - 1)

      /* Input zurücksetzen damit man gleich nochmal hochladen kann */
      event.target.value = ''
    },

    async fotoLoeschen(fotoId) {
      if (!confirm('Dieses Foto wirklich löschen?')) return
      await fetch(`${API}/fotos/${fotoId}`, { method: 'DELETE' })
      await this.fotosLaden()
      if (this.aktuellerIndex >= this.fotos.length) {
        this.aktuellerIndex = Math.max(0, this.fotos.length - 1)
      }
    },

    /* Bild auf MAX_BREITE verkleinern und mit JPEG_QUALITAET komprimieren*/
    /* Ein typisches Handy-Foto (4000x3000px, 5MB) wird so auf ~100-200KB */
    bildVerkleinern(datei) {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')

          /* Nur verkleinern wenn das Bild breiter als MAX_BREITE ist */
          const scale = Math.min(1, MAX_BREITE / img.width)
          canvas.width = img.width * scale
          canvas.height = img.height * scale

          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)

          /* Als JPEG mit reduzierter Qualität exportieren */
          canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITAET)
        }
        img.src = URL.createObjectURL(datei)
      })
    },

    /*  Blob/File Objekt in Base64 String umwandeln */
    zuBase64(datei) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(datei)
      })
    }
  }
}
</script>

<style scoped>
.foto-bereich {
  margin-top: 24px;
  border-top: 1px solid rgba(90, 76, 51, 0.3);
  padding-top: 20px;
}

.upload-bereich {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.upload-label {
  cursor: pointer;
  background: #8b6914;
  color: #f4ecdc;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: Georgia, serif;
}
.upload-label:hover { background: #6b4f10; }

.lade-text {
  color: #8a7456;
  font-size: 0.82rem;
  font-style: italic;
}

.fehler-text {
  color: #c0392b;
  font-size: 0.82rem;
}

.carousel {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pfeil {
  background: #8b6914;
  color: #f4ecdc;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 1.5rem;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pfeil:disabled {
  background: #c8b89a;
  cursor: not-allowed;
}

.bild-container {
  position: relative;
  flex: 1;
}

.bild-container img {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid rgba(90, 76, 51, 0.3);
}

.loeschen-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  cursor: pointer;
  font-size: 0.8rem;
}
.loeschen-btn:hover { background: rgba(180, 60, 40, 0.8); }

.zaehler {
  text-align: center;
  margin-top: 8px;
  color: #8a7456;
  font-size: 0.8rem;
  font-family: Georgia, serif;
}

.keine-fotos {
  color: #a89878;
  font-style: italic;
  font-size: 0.85rem;
  font-family: Georgia, serif;
}
</style>
