import React, { useState, useEffect, useRef, useReducer } from "react";
import styled from "styled-components";
import theme from "../../theme/theme";
import alpha from "../../assets/images/alpha.jpg";
import {
  rgba,
  parseToRgb,
  opacify,
  transparentize,
  backgroundImages,
} from "polished";
import { connect } from "react-redux";
import {
  changeBackgroundType as changeBackgroundTypeAction,
  changeBackgroundOption as changeBackgroundOptionAction,
  changeGradient as changeGradientAction,
  changeGradientType as changeGradientTypeAction,
  changeGradientDirection as changeGradientDirectionAction,
  addGradient as addGradientAction,
  updateGradient as updateGradientAction,
  deleteBackground as deleteBackgroundAction,
} from "../../actions";
import {
  BackgroundBlock,
  BackgroundBlockHeader,
  Columns,
  Column,
  BackgroundOptions,
} from "./BlockTree";
import { Panel as ColorPickerPanel } from "rc-color-picker";
import "rc-color-picker/assets/index.css";
import { handleBgPositionChange } from "../../utils";
import Button from "../elements/Button";
import GradientPoint from "./BlockTreeGradientPoint";
import Input from "../elements/Input";

const Header = styled.h2`
  font-size: 2rem;
  padding: 10px;
`;

const Gradients = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 5px;
  width: calc(100% - 30px);
  @media screen and (min-width: ${theme.widths.tablet}) {
    grid-template-columns: repeat(5, 20%);
  }
`;

const GradientMiniature = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 2rem;
  height: 45px;
  width: 50px;
  margin: 3px;
  ${(p: GradientMiniatureProps) =>
    p.active &&
    `
    outline: 2px solid red;
  `}
  &:hover {
    outline: 2px solid red;
  }
`;

const GradientLine = styled.div`
  position: relative;
  width: calc(100% - 10px);
  margin: 30px auto 15px auto;
  border: 2px solid #555;
  height: 35px;
  background-image: url(${alpha});
  background-repeat: repeat;
  cursor: pointer;
  z-index: 990;
`;

const GradientLineOverlay = styled.div<GradientLineOverlayProps>`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 999;
  user-select: none;
`;

interface GradientLineOverlayProps {
  ref: any;
}

interface GradientMiniatureProps {
  active?: boolean;
}

interface BlockTreeGradientProps {
  background: Background;
  gradients: Gradient[];
  blockId: number;
  currentPreset: Preset;
  changeBackgroundType: (idBlock: number, idBG: number, toType: string) => void;
  changeBackgroundOption: (
    idBlock: number,
    idBG: number,
    value: string,
    type: string
  ) => void;
  changeGradient: (idBlock: number, idBG: number, value: number) => void;
  changeGradientType: (grad: number, type: string) => void;
  changeGradientDirection: (grad: number, direction: number) => void;
  addGradient: () => void;
  updateGradient: (idGrad: number, value: string) => void;
  deleteBackground: (idBlock: number, idBG: number) => void;
}

const BlockTreeGradient: React.FC<BlockTreeGradientProps> = ({
  background: b,
  gradients,
  blockId: bl,
  changeBackgroundType,
  changeBackgroundOption,
  changeGradient,
  changeGradientType,
  changeGradientDirection,
  addGradient,
  updateGradient,
  deleteBackground,
}) => {
  const getGrad = () => {
    return gradients[b.backgroundImage].backgroundImage;
  };

  const getParts = () => {
    let parts = getGrad()
      .replace(/radial-gradient\(|linear-gradient\(|\)$/g, "")
      .split(/,(?![^()]*(?:\([^()]*\))?\))/);
    parts.shift();
    parts = parts.map((p, i) => ({
      id: i,
      color: p.match(/rgba\([\d\b\\.,]+\)/)[0],
      position: +p.match(/\d+%/)[0].replace("%", ""),
    }));
    return parts;
  };
  const getType = () => {
    return getGrad().replace(/\(.*/, "");
  };

  const [gradientDeg, gradientDegChange] = useState<number>(0);
  const [activePoint, changeActivePoint] = useState<number>(0);
  const [activeColor, changeActiveColor] = useState<string>("#ffffff");
  const [activeAlpha, changeActiveAlpha] = useState<number>(100);
  const refLine = useRef<HTMLElement>(document.createElement("div"));

  const handleGradientDegChange = (e) => {
    gradientDegChange(e.target.value);
    changeGradientDirection(b.backgroundImage as number, e.target.value);
  };

  const glueGradient = (parts, deg = 0) => {
    const calc = `${parts.map((p) => `${p.color} ${p.position}%`).join(",")}`;

    if (getType() === "linear-gradient") {
      return `linear-gradient(${deg}deg, ${calc})`;
    }
    if (getType() === "radial-gradient") {
      return `radial-gradient(circle, ${calc})`;
    }
  };

  const handlePointPosition = (e) => {
    const theLine = refLine.current,
      pointNr = +e.target.getAttribute("id").split("-")[0];

    let rangeLeft = theLine.getBoundingClientRect().left,
      lineWidth = theLine.getBoundingClientRect().width;

    changeActivePoint(pointNr);
    changeActiveColor(getParts()[pointNr].color);
    changeActiveAlpha(
      +getParts()
        [pointNr].color.replace(/rgba\(\s?\d+\s?,\s?\d+\s?,\s?\d+\s?,/, "")
        .replace(/\)/, "") * 100
    );

    const updatePointPos = (e) => {
      if (e.pageX >= rangeLeft && e.pageX <= rangeLeft + lineWidth) {
        let moveTo, isLeft;
        let parts = getParts().map((p, i) => {
          if (p.id !== pointNr) {
            return p;
          }
          isLeft =
            Math.round(((e.pageX - rangeLeft) * 100) / lineWidth) -
              p.position >=
            0
              ? false
              : true;
          return {
            ...p,
            position: Math.round(((e.pageX - rangeLeft) * 100) / lineWidth),
          };
        });
        parts = parts.sort((a, b) => {
          if (a.position > b.position && !isLeft) {
            moveTo = b.id;
          }
          if (a.position > b.position && isLeft) {
            moveTo = a.id;
          }
          return a.position > b.position;
        });
        updateGradient(
          +b.backgroundImage,
          glueGradient(parts, gradientDeg) as string
        );

        changeActivePoint(moveTo >= 0 ? moveTo : pointNr);
      }
    };

    const handleMouseMove = (e) => {
      updatePointPos(e);
    };

    document.addEventListener("mousemove", handleMouseMove);

    document.addEventListener("mouseup", function (e) {
      document.removeEventListener("mousemove", handleMouseMove);
    });
  };

  const handlePointColor = (colors) => {
    if (activePoint === null) {
      return;
    }
    changeActiveColor(rgba(colors.color, colors.alpha / 100));
    changeActiveAlpha(colors.alpha);
    let parts = getParts().map((p) => {
      if (p.id !== activePoint) {
        return p;
      }
      return {
        ...p,
        color: rgba(colors.color, colors.alpha / 100),
      };
    });

    updateGradient(
      +b.backgroundImage,
      glueGradient(parts, gradientDeg) as string
    );
  };

  const handleDeletePoint = (which: number) => {
    const filtered = getParts().filter((p) => p.id !== which);
    updateGradient(
      +b.backgroundImage,
      glueGradient(filtered, gradientDeg) as string
    );
  };

  const handleAddPoint = (e) => {
    const theLine = e.target,
      rangeLeft = theLine.getBoundingClientRect().left,
      lineWidth = theLine.getBoundingClientRect().width,
      position = Math.round(((e.pageX - rangeLeft) * 100) / lineWidth);
    let isntLast,
      moreParts = [
        ...getParts(),
        {
          id: -1,
          position,
          color: rgba(activeColor, activeAlpha),
        },
      ];
    moreParts = moreParts.sort((a, b) => {
      if (a.position > b.position) {
        changeActivePoint(a.id);
        isntLast = true;
      }
      return +(a.position > b.position);
    });

    if (!isntLast) {
      changeActivePoint(moreParts.length - 1);
    }

    updateGradient(
      +b.backgroundImage,
      glueGradient(moreParts, gradientDeg) as string
    );
  };

  return (
    <BackgroundBlock>
      <BackgroundBlockHeader>
        <Header>Background</Header>
        <div>
          <Button info>Use</Button>
          <Button>&#8648;</Button>
          <Button>&#8650;</Button>
          <Button onClick={() => deleteBackground(bl, b.id)} danger>
            &#x2716;
          </Button>
        </div>
      </BackgroundBlockHeader>
      <Columns>
        <Column>
          <BackgroundOptions>
            <p>
              <Button onClick={() => changeBackgroundType(bl, b.id, "image")}>
                Image
              </Button>
              <Button confirm>Gradient</Button>:
            </p>
          </BackgroundOptions>
          <BackgroundOptions>
            <Gradients>
              {gradients.map((g) => (
                <GradientMiniature
                  active={g.id === (b.backgroundImage as number)}
                  key={`grad-${b.id}-${g.id}`}
                  style={{ backgroundImage: g.backgroundImage }}
                  onClick={() => {
                    changeGradient(bl, b.id, g.id);
                    gradientDegChange(
                      +gradients[g.id].backgroundImage
                        .replace(/linear-gradient\(\s?/, "")
                        .replace(/deg.*/, "")
                    );
                    changeActivePoint(0);
                  }}
                ></GradientMiniature>
              ))}
              <GradientMiniature
                onClick={() => {
                  addGradient();
                  changeGradient(bl, b.id, gradients[gradients.length - 1].id);
                  changeActivePoint(0);
                }}
              >
                +
              </GradientMiniature>
            </Gradients>
            <BackgroundOptions>
              <GradientLine>
                <GradientLineOverlay
                  id={`grad-line-${bl}-${b.id}-${b.backgroundImage}`}
                  ref={refLine}
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${getParts()
                      .map((p) => `${p.color} ${p.position}%`)
                      .join(",")})`,
                  }}
                  onMouseDown={handleAddPoint}
                ></GradientLineOverlay>
                {getParts().map((p, i) => {
                  return (
                    <GradientPoint
                      id={`${p.id}-grad-point-${b.id}-${bl}-${i}-${b.backgroundImage}`}
                      lineId={`grad-line-${bl}-${b.id}-${b.backgroundImage}`}
                      key={`grad-point-${b.id}-${bl}-${p.id}-${b.backgroundImage}`}
                      color={p.color}
                      position={p.position}
                      onMouseDown={handlePointPosition}
                      activePoint={p.id === activePoint ? true : false}
                      remove={handleDeletePoint}
                    ></GradientPoint>
                  );
                })}
              </GradientLine>

              <br />
              <ColorPickerPanel
                id={`color-picker-${bl}-${b.id}`}
                alpha={activeAlpha}
                color={activeColor}
                defaultColor={activeColor}
                enableAlpha
                mode="RGB"
                onChange={handlePointColor}
              />
              <br />
            </BackgroundOptions>
          </BackgroundOptions>
        </Column>
        <Column>
          <BackgroundOptions>
            <p>Options:</p>
            <p>
              <small>Position: </small>
              <Button
                onClick={() => {
                  const newPos = handleBgPositionChange(
                    0,
                    b.backgroundPosition!
                  );
                  changeBackgroundOption(
                    bl,
                    b.id,
                    newPos,
                    "backgroundPosition"
                  );
                }}
                confirm
              >{`X: ${b.backgroundPosition?.split(" ")[0]}`}</Button>
              <Button
                onClick={() => {
                  const newPos = handleBgPositionChange(
                    1,
                    b.backgroundPosition!
                  );
                  changeBackgroundOption(
                    bl,
                    b.id,
                    newPos,
                    "backgroundPosition"
                  );
                }}
                confirm
              >{`Y: ${b.backgroundPosition?.split(" ")[1]}`}</Button>
            </p>
            <p>
              <small>Repeat: </small>
              <Button
                onClick={() =>
                  changeBackgroundOption(
                    bl,
                    b.id,
                    "no-repeat",
                    "backgroundRepeat"
                  )
                }
                confirm={b.backgroundRepeat === "no-repeat"}
              >
                No repeat
              </Button>
              <Button
                onClick={() =>
                  changeBackgroundOption(bl, b.id, "repeat", "backgroundRepeat")
                }
                confirm={b.backgroundRepeat === "repeat"}
              >
                Repeat
              </Button>
              <Button
                onClick={() =>
                  changeBackgroundOption(
                    bl,
                    b.id,
                    "repeat-x",
                    "backgroundRepeat"
                  )
                }
                confirm={b.backgroundRepeat === "repeat-x"}
              >
                Repeat X
              </Button>
              <Button
                onClick={() =>
                  changeBackgroundOption(
                    bl,
                    b.id,
                    "repeat-y",
                    "backgroundRepeat"
                  )
                }
                confirm={b.backgroundRepeat === "repeat-y"}
              >
                Repeat Y
              </Button>
            </p>
            <p>
              <small>Type: </small>
              <Button
                onClick={() => {
                  changeGradientType(
                    b.backgroundImage as number,
                    "linear-gradient"
                  );
                  gradientDegChange(0);
                }}
                confirm={getType() === "linear-gradient"}
              >
                Linear
              </Button>
              <Button
                onClick={() =>
                  changeGradientType(
                    b.backgroundImage as number,
                    "radial-gradient"
                  )
                }
                confirm={getType() === "radial-gradient"}
              >
                Radial
              </Button>
            </p>
            {getType() === "linear-gradient" && (
              <p>
                <small>Direction (deg): </small>
                <Input
                  onChange={handleGradientDegChange}
                  value={gradientDeg}
                  type="number"
                />
              </p>
            )}
          </BackgroundOptions>
        </Column>
      </Columns>
    </BackgroundBlock>
  );
};

const mapDispatchToProps = (dispatch) => ({
  changeBackgroundType: (idBlock, idBG, toType) =>
    dispatch(changeBackgroundTypeAction(idBlock, idBG, toType)),
  changeBackgroundOption: (idBlock, idBG, value, type) =>
    dispatch(changeBackgroundOptionAction(idBlock, idBG, value, type)),
  changeGradient: (idBlock, idBG, value) =>
    dispatch(changeGradientAction(idBlock, idBG, value)),
  changeGradientType: (grad, type) =>
    dispatch(changeGradientTypeAction(grad, type)),
  changeGradientDirection: (grad, type) =>
    dispatch(changeGradientDirectionAction(grad, type)),
  addGradient: () => dispatch(addGradientAction()),
  updateGradient: (idGrad, value) =>
    dispatch(updateGradientAction(idGrad, value)),
  deleteBackground: (idBlock, idBG) =>
    dispatch(deleteBackgroundAction(idBlock, idBG)),
});

const mapStateToProps = (state) => {
  const { currentPreset, gradients } = state;
  return {
    currentPreset,
    gradients,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(BlockTreeGradient);
