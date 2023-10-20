package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

type CardResponse struct {
	Data     []json.RawMessage `json:"data"`
	HasMore  bool              `json:"has_more"`
	NextPage string            `json:"next_page"`
}

func FetchCards() {
	url := "https://api.scryfall.com/cards/search?q=game%3Aarena"
	filename := "../client/public/cards.json"

	var allCards []json.RawMessage

	i := 1
	for {
		// Fetch the data from the API
		resp, err := http.Get(url)
		if err != nil {
			fmt.Printf("Error fetching data: %v\n", err)
			return
		}

		if resp.StatusCode != http.StatusOK {
			fmt.Printf("Error status: %v\n", resp.Status)
			return
		}

		body, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			fmt.Printf("Error reading body: %v\n", err)
			return
		}

		// Unmarshal the JSON
		var response CardResponse
		err = json.Unmarshal(body, &response)
		if err != nil {
			fmt.Printf("Error unmarshalling JSON: %v\n", err)
			return
		}

		allCards = append(allCards, response.Data...)

		if !response.HasMore {
			break
		}

		fmt.Printf("Page %d\n", i)
		i++
		url = response.NextPage
	}

	// Write all cards to a JSON file
	file, err := os.Create(filename)
	if err != nil {
		fmt.Printf("Error creating file: %v\n", err)
		return
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(allCards); err != nil {
		fmt.Printf("Error writing to JSON file: %v\n", err)
		return
	}

	fmt.Println("Cards fetched and written to", filename)
}
