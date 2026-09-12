import json
from pathlib import Path
from typing import Dict, List, Optional

class SymptomNormalizer:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent.parent / "seed"
        self.translations = self._load_json("translations.json")
        self.symptoms = self._load_json("symptoms.json")
        self._build_normalization_map()

    def _load_json(self, filename: str) -> dict:
        file_path = self.base_dir / filename
        if not file_path.exists():
            return {}
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _build_normalization_map(self):
        self.normalization_map = {}
        # Load from all languages
        for lang, mappings in self.translations.items():
            for phrase, code in mappings.items():
                self.normalization_map[phrase.lower().strip()] = code
        
        # Add basic standard symptoms to self mapping as well
        if isinstance(self.symptoms, list):
            for symptom in self.symptoms:
                self.normalization_map[symptom["id"].lower()] = symptom["id"]
                self.normalization_map[symptom["name"].lower()] = symptom["id"]

    def normalize(self, symptom_text: str) -> Optional[str]:
        """Normalizes a raw symptom string to a standard symptom code."""
        normalized_text = symptom_text.lower().strip()
        # Direct lookup
        if normalized_text in self.normalization_map:
            return self.normalization_map[normalized_text]
        return None

normalizer = SymptomNormalizer()
