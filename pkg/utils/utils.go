package utils

func Contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

func GetMapInterface(s []string) map[string]struct{} {
	res := map[string]struct{}{}
	for _, a := range s {
		res[a] = struct{}{}
	}
	return res
}

func AddToMapInterface(m map[string]struct{}, s []string) {
	for _, a := range s {
		m[a] = struct{}{}
	}
}

func IsOwnerKind(kind string) bool {
	if kind == "Pod" || kind == "Service" || kind == "Node" {
		return false
	}
	return true
}
