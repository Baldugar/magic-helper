package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

type CardLanguage string

const (
	CardLanguageEnglish            CardLanguage = "en"
	CardLanguageSpanish            CardLanguage = "es"
	CardLanguageFrench             CardLanguage = "fr"
	CardLanguageGerman             CardLanguage = "de"
	CardLanguageItalian            CardLanguage = "it"
	CardLanguagePortuguese         CardLanguage = "pt"
	CardLanguageJapanese           CardLanguage = "ja"
	CardLanguageKorean             CardLanguage = "ko"
	CardLanguageRussian            CardLanguage = "ru"
	CardLanguageSimplifiedChinese  CardLanguage = "zh-CN"
	CardLanguageTraditionalChinese CardLanguage = "zh-TW"
	CardLanguageHebrew             CardLanguage = "he"
	CardLanguageLatin              CardLanguage = "la"
	CardLanguageAncientGreek       CardLanguage = "grc"
	CardLanguageArabic             CardLanguage = "ar"
	CardLanguageSanskrit           CardLanguage = "sa"
	CardLanguagePhyrexian          CardLanguage = "ph"
	CardLanguageQuenya             CardLanguage = "qya"
)

var AllScryfallCardLanguage = []CardLanguage{
	CardLanguageEnglish,
	CardLanguageSpanish,
	CardLanguageFrench,
	CardLanguageGerman,
	CardLanguageItalian,
	CardLanguagePortuguese,
	CardLanguageJapanese,
	CardLanguageKorean,
	CardLanguageRussian,
	CardLanguageSimplifiedChinese,
	CardLanguageTraditionalChinese,
	CardLanguageHebrew,
	CardLanguageLatin,
	CardLanguageAncientGreek,
	CardLanguageArabic,
	CardLanguageSanskrit,
	CardLanguagePhyrexian,
	CardLanguageQuenya,
}

func (e CardLanguage) IsValid() bool {
	for _, v := range AllScryfallCardLanguage {
		if e == v {
			return true
		}
	}
	return false
}

func (e CardLanguage) String() string {
	return string(e)
}

func (e *CardLanguage) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = CardLanguage(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ScryfallCardLanguage", str)
	}
	return nil
}

func (e CardLanguage) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
