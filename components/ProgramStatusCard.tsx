import { Image, Text, TouchableOpacity, View } from "react-native";
import { Svg, Circle } from "react-native-svg";
import { ActiveProgram, ProgramMode } from "../lib/programState";

const titleMap: Record<ProgramMode, string> = {
  quick: "Snabbläge",
  eco: "Ecoläge",
  normal: "Standardläge",
};

const descriptionMap: Record<ProgramMode, string> = {
  quick: "Just nu utförs en snabbtork!",
  eco: "Just nu körs ett energisnålt program!",
  normal: "Just nu körs standardprogrammet!",
};

const imageMap: Record<ProgramMode, any> = {
  quick: require("../assets/images/quick-mode.png"),
  eco: require("../assets/images/eco-mode.png"),
  normal: require("../assets/images/normal-mode.png"),
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

type Props = {
  activeProgram: ActiveProgram | null;
  remainingTime: number;
  emptyText?: string;
  onStopProgram?: () => void;
};

export function ProgramStatusCard({
  activeProgram,
  remainingTime,
  emptyText = "Inget program körs",
  onStopProgram,
}: Props) {
  const totalDurationSec = 2 * 60 * 60;
  const progress =
    totalDurationSec > 0
      ? Math.max(0, Math.min(1, remainingTime / totalDurationSec))
      : 0;

  return (
    <View className="mt-10">
      <Text className="text-lg font-semibold mb-3">Pågående program</Text>
      {!activeProgram ? (
        <Text className="text-sm text-gray-600">{emptyText}</Text>
      ) : (
        <View className="flex-row items-center justify-between bg-white rounded-3xl px-5 py-5 shadow">
          <View className="flex-1 pr-5">
            <Text className="text-lg font-semibold mb-2">
              {titleMap[activeProgram.mode]}
            </Text>
            <Text className="text-sm text-gray-600 mb-3">
              {descriptionMap[activeProgram.mode]}
            </Text>
            <Text className="text-xs text-gray-500">
              Återstående tid: {formatTime(remainingTime)}
            </Text>
          </View>

          <View className="items-center">
            <View
              style={{
                width: 96,
                height: 96,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Svg width={96} height={96}>
                <Circle
                  cx={48}
                  cy={48}
                  r={42}
                  stroke="#e5e7eb"
                  strokeWidth={5}
                  fill="none"
                />
                <Circle
                  cx={48}
                  cy={48}
                  r={42}
                  stroke="#4ade80"
                  strokeWidth={5}
                  fill="none"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={(2 * Math.PI * 42) * (1 - progress)}
                  strokeLinecap="round"
                  rotation={-90}
                  origin="48,48"
                />
              </Svg>
              <View
                style={{
                  position: "absolute",
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  source={imageMap[activeProgram.mode]}
                  style={{ width: 56, height: 56 }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {activeProgram && onStopProgram && (
        <View className="mt-8">
          <TouchableOpacity
            className="rounded-2xl py-3 items-center"
            style={{ backgroundColor: "#E45EB3" }}
            onPress={onStopProgram}
          >
            <Text className="text-white font-semibold">
              Avsluta pågående program
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

