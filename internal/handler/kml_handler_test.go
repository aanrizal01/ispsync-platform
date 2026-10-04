package handler

import (
	"strings"
	"testing"
)

func TestParseKMLPlacemarks(t *testing.T) {
	kml := `<?xml version="1.0"?><kml><Document><name>Doc</name><Folder><name>F</name>
<Placemark><name>odp-tif-001</name><Point><coordinates>100.35,-0.95,0</coordinates></Point></Placemark>
<Placemark><name>Jalur</name><LineString><coordinates>1,2 3,4</coordinates></LineString></Placemark>
<Placemark><name>ODP-TIF-002</name><Point><coordinates> 100.36 ,-0.96</coordinates></Point></Placemark>
</Folder></Document></kml>`
	got, err := parseKMLPlacemarks(strings.NewReader(kml))
	if err != nil || len(got) != 3 {
		t.Fatalf("got %v err %v", got, err)
	}
	if got[0].Name != "odp-tif-001" || got[0].Coords != "100.35,-0.95,0" {
		t.Fatalf("bad first: %+v", got[0])
	}
	if got[1].Coords != "" {
		t.Fatalf("LineString must not yield point coords: %+v", got[1])
	}
	if got[2].Name != "ODP-TIF-002" {
		t.Fatalf("bad third: %+v", got[2])
	}
}
